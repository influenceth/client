import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';
import { Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
// TODO: would be nice if the cached lot collections was somehow a collection of ['lots', asteroid.id, lot.id], so when we invalidate the relevant lot, the "collection" is updated
// TODO: would be nice to replace the query results using the linked asset we've already been passed (where that is possible)

const ActivitiesContext = createContext();
const ignoreEventTypes = ['CURRENT_ETH_BLOCK_NUMBER'];

const isMismatch = (updateValue, queryCacheValue) => {
  // entity mismatch
  if (updateValue?.uuid) {
    return updateValue.uuid !== queryCacheValue.uuid;
  }
  if (updateValue?.id && updateValue?.label) {
    return !((updateValue.id == queryCacheValue.id) && (updateValue.label == queryCacheValue.label));
  }

  // array of possible updates (NOTE: `==` is deliberate for looseness)
  if (Array.isArray(updateValue)) {
    return !updateValue.find((v) => v == queryCacheValue);
  }

  // array of included values (i.e. multiple statuses in filter, this changed to one of them)
  if (Array.isArray(queryCacheValue)) {
    return !queryCacheValue.find((v) => v == updateValue);
  }

  // straightforward (NOTE: `!=` is deliberate for looseness)
  return updateValue != queryCacheValue;
}

export function ActivitiesProvider({ children }) {
  const { token, setBlockNumber } = useSession();
  const { crew, pendingTransactions, refreshReadyAt } = useCrewContext();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [ activities, setActivities ] = useState([]);

  const pendingBatchActivities = useRef([]);
  const pendingTimeout = useRef();

  // useEffect(() => {
  //   const onKeydown = (e) => {
  //     if (e.shiftKey && e.which === 32) {
  //       const events = [
  //         {
  //           event: {
  //             "name": "ShipDocked",
  //             "version": 0,
  //             "event": "ShipDocked",
  //             "returnValues": {
  //               // asteroid: { label: 3, id: 26267 },
  //               // building: { label: 5, id: 83 },
  //               // finishTime: Math.floor(Date.now() / 1000) + 3600,
  //               dock: { label: 4, id: 6913102050230273 },
  //               // dock: { label: 5, id: 41 },
  //               ship: { label: 6, id: 1 },
  //               callerCrew: { label: 1, id: 9 },
  //               caller: '0x04b4e621185c5a62dd145edAAAA6f42BE775b5E34571bBDb0F05d91b1cA03A06'
  //             }
  //           },
  //         }
  //       ];

  //       console.log('fake event', events[0]?.event?.name);
  //       hydrateActivities(events, queryClient).then(() => {
  //         console.log('hydrated');
  //         handleActivities(events);
  //       })
  //     }
  //   };
  //   document.addEventListener('keydown', onKeydown);
  //   return () => {
  //     document.removeEventListener('keydown', onKeydown);
  //   }
  // }, []);

  const handleActivities = useCallback((newActivities, skipInvalidations) => {
    // return;

    // refresh crew's readyAt
    let shouldRefreshReadyAt = false;

    // prep activities, then handle
    const transformedActivities = newActivities.map((e) => {
      e.id = e.id || e._id;
      e.key = e.id;
      return e;
    });

    // (hopefully cure any race conditions with the setTimeout)
    // TODO: this timeout can be removed if/when we start optimistically updating query cache from
    //        the event's linked assets
    setTimeout(() => {
      transformedActivities.forEach(activity => {
        if (!skipInvalidations) {
          const debugInvalidation = false;
          const activityConfig = getActivityConfig(activity);
          shouldRefreshReadyAt = shouldRefreshReadyAt || !!activityConfig?.requiresCrewTime;

          // console.log('invalidations', activityConfig?.invalidations);
          (activityConfig?.invalidations || []).forEach((invalidationConfig) => {
            const invalidations = [];

            // this is a raw queryKey
            // (i.e. `[ 'ethBalance', walletAddress ]`)
            if (Array.isArray(invalidationConfig)) {
              invalidations.push(invalidationConfig)

            // else, this is an entity object
            } else if (invalidationConfig) {
              // NOTE: if key is not present in updated values, value was not updated
              const { id, label, newGroupEval } = invalidationConfig;
              if (debugInvalidation && newGroupEval?.updatedValues) console.log(`${label}.${id} updates include`, newGroupEval);

              // invalidate `entity` entry
              invalidations.push(['entity', label, id]);
              invalidations.push(['activities', label, id]);

              // walk through `entities` entries of label type
              // refetch group keys no longer part of, and refetch group keys it just became part of
              // TODO: just fetch active?
              queryClient.getQueriesData(['entities', label]).forEach(([ queryKey, data ]) => {
                if (data === undefined) {
                  console.log('bad query cache value', queryKey, data);
                  return;
                }

                // if updated entity is already in entity group, invalidate (to update/delete)
                // TODO (enhancement): update-in-place
                if (!!(data || []).find((d) => ((d.id === id) && (d.label === label)))) {
                  if (debugInvalidation) console.log(`${label}.${id} is already in collection`, queryKey);
                  invalidations.push(queryKey);

                // else, check if it is technically possible (to the best of our knowledge)
                // that the updated entity now *could be* part of a new entity group based
                // on what changed about it... we will rely on newGroupEval to guide us
                } else if (newGroupEval?.updatedValues) {
                  const { updatedValues, filters } = newGroupEval;
                  const collectionFilter = typeof queryKey[2] === 'object' ? queryKey[2] : {};
                  let skip = false;

                  // if none of the updatedValue keys appear in the group filter, it's impossible that
                  // the updatedValue would cause this entity to now belong to this group... skip
                  // (this assumes we have written our useQuery keys to be comprehensive!)
                  // i.e. if ship controller changed, may not need to invalidate a group specifying all ships on a lot
                  if (!Object.keys(updatedValues).find((k) => collectionFilter.hasOwnProperty(k))) {
                    if (debugInvalidation) console.log('not in filter', updatedValues, collectionFilter);
                    skip = true;
                  }

                  // if at least one of the updatedValues would exclude the updated entity from the
                  // group, then impossible it would be added to this group... skip
                  else if (Object.keys(updatedValues).find((k) => collectionFilter.hasOwnProperty(k) && isMismatch(updatedValues[k], collectionFilter[k]))) {
                    if (debugInvalidation) console.log('change excluded');
                    skip = true;
                  }

                  // if at least one of the filters exclude this queryKey from including updated entity... skip
                  // i.e. if ship status changed, may only need to invalidate groups scoped to one asteroid
                  else if (filters && Object.keys(filters).find((k) => collectionFilter.hasOwnProperty(k) && filters[k] !== undefined && isMismatch(filters[k], collectionFilter[k]))) {
                    if (debugInvalidation) console.log('filter excluded');
                    skip = true;
                  }

                  // if didn't skip... invalidate as a precaution
                  if (!skip) {
                    if (debugInvalidation) console.log(`${label}.${id} might be joining collection`, JSON.stringify(queryKey));
                    invalidations.push(queryKey);
                  }
                  // else if (debugInvalidation) console.log(`${label}.${id} will NOT be joining collection`, JSON.stringify(queryKey));
                }
              });
              
              // invalidate searches potentially a part of
              // TODO: would be nice to check against criteria similar to 'entities' above
              let searchAssets = [];
              if (label === Entity.IDS.ASTEROID)
                searchAssets = ['asteroids'/*, 'asteroidsMapped'*/]; // asteroidsMapped uses asteroids
              if (label === Entity.IDS.BUILDING)
                searchAssets = ['buildings'];
              if (label === Entity.IDS.CREW)
                searchAssets = ['crews'];
              if (label === Entity.IDS.CREWMATE)
                searchAssets = ['crewmates'];
              if (label === Entity.IDS.DEPOSIT)
                searchAssets = ['coresamples'];
              if (label === Entity.IDS.LOT)
                searchAssets = ['lots'/*, 'lotsMapped'*/]; // lotsMapped uses packed data
              if (label === Entity.IDS.SHIP)
                searchAssets = ['ships'];

              searchAssets.forEach((assetType) => {
                invalidations.push(['search', assetType])
              });
            }

            if (debugInvalidation) console.log('invalidate', invalidationConfig, invalidations);
            invalidations.forEach((queryKey) => {
              // console.log('state', queryClient.getQueryState(queryKey))
              queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
            });
          });

          if (activityConfig?.triggerAlert) {
            createAlert({
              type: 'ActivityLog',
              data: activityConfig?.logContent,
              duration: 10000
            })
          };
        }
      });

      setActivities((prevActivities) => uniq([
        ...transformedActivities,
        ...prevActivities
      ], 'key'));

      if (shouldRefreshReadyAt) {
        refreshReadyAt();
      }

    }, 2500);
  }, [getActivityConfig, refreshReadyAt]);

  // try to process WS activities grouped by block
  const processPendingWSBatch = useCallback(async () => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }

    const activitiesToProcess = (pendingBatchActivities.current || []).slice(0);
    pendingBatchActivities.current = [];

    if (activitiesToProcess.length > 0) {
      await hydrateActivities(activitiesToProcess, queryClient);
      handleActivities(activitiesToProcess);
    }
  }, [handleActivities]);

  const onWSMessage = useCallback((message) => {
    if (process.env.NODE_ENV !== 'production') console.log('onWSMessage', message);
    const { type, body } = message;
    if (ignoreEventTypes.includes(type)) return;
    if (type === 'CURRENT_STARKNET_BLOCK_NUMBER') {
      if (body.blockNumber > 0) setBlockNumber(body.blockNumber);
    } else {

      // queue the current activity for processing
      pendingBatchActivities.current.push(body);

      // schedule processing for now + 1s (in case more activities are coming from this block)
      // NOTE: if we ever limit the number of activities emitted per action, we can remove this batching
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
      pendingTimeout.current = setTimeout(processPendingWSBatch, 1000);
    }
  }, [processPendingWSBatch]);

  const isFirstLoad = useRef(true); // (i.e. this is not a crew switch)
  useEffect(() => {
    if (!wsReady) return;
    if (!token) return;

    // if authed, populate existing activities and start listening to user websocket
    // if have pending transactions, load back to the oldest one in case it missed the activity;
    // else, will just pull most recent X (limit set on server)

    const pendingTxHashes = pendingTransactions
      .map((tx) => tx.txHash)
      .filter((txHash) => !!txHash);
    if (pendingTxHashes?.length > 0) {
      // NOTE: since is to make sure no pagination occurs... we should fix this endpoint on the server
      api.getTransactionActivities(pendingTxHashes).then(async (data) => {
        await hydrateActivities(data.activities, queryClient);
        handleActivities(data.activities, isFirstLoad.current);
        if (data.blockNumber > 0) setBlockNumber(data.blockNumber);
      });
    } else {
      handleActivities([], isFirstLoad.current);
    }

    // after loaded once, if switch crews, this block will run again... but in the event of catching up
    // on missing pending activities here, we DO need to invalidate the cache values
    isFirstLoad.current = false;

    // setup ws listeners
    registerWSHandler(onWSMessage);
    const crewRoom = crew?.id ? `Crew::${crew.id}` : null;
    if (crewRoom) registerWSHandler(onWSMessage, crewRoom);

    // reset on logout / disconnect
    return () => {
      setActivities([]);
      unregisterWSHandler();
      if (crewRoom) unregisterWSHandler(crewRoom);
    }
  }, [crew?.id, onWSMessage, token, wsReady]);

  return (
    <ActivitiesContext.Provider value={activities}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export default ActivitiesContext;
