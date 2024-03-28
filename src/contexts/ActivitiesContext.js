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
          const debugInvalidation = true;
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
            } else {
              // NOTE: if key is not present in updated values, value was not updated
              const { id, label, updatedValues } = invalidationConfig;
              
              // invalidate `entity` entry
              invalidations.push(['entity', label, id]);

              // walk through `entities` entries of label type
              // refetch group keys no longer part of, and refetch group keys it just became part of
              queryClient.getQueriesData(['entities', label]).forEach(([ queryKey, data ]) => {
                // if updatedValues do not exclude entity from potentially joining
                // a collection according to that query filter, must invalidate that
                // collection as a precaution

                // is impossible could be added to collection if...
                // 1) no updatedValue keys are in collectionFilter
                //      - either is already part of results (will be updated/removed below))
                //        OR not possible to be newly part of results
                // 2) updatedValue key is in collectionFilter with non-matching value
                //      - not newly part of results (if already part of results, will be removed below)

                const collectionFilter = queryKey[2] === 'object' ? queryKey[2] : {};
                const isPossibleThatAddedToCollection = !( // !impossible
                  // no updatedValues are filtered on
                  !Object.keys(updatedValues).find((k) => collectionFilter.hasOwnProperty(k))
                  // OR at least one updatedValue disqualifies from being in filter
                  // NOTE: `!=` is deliberate to be looser
                  || Object.keys(updatedValues).find((k) => updatedValues[k] != collectionFilter[k])
                );
                if (debugInvalidation && isPossibleThatAddedToCollection) console.log(`${label}.${id} might be joining collection`, queryKey);

                const isAlreadyInCollection = data.find((d) => d.id === id && d.label === label);
                if (debugInvalidation && isAlreadyInCollection) console.log(`${label}.${id} is already in collection`, queryKey);

                if (isAlreadyInCollection || isPossibleThatAddedToCollection) {
                  invalidations.push(queryKey);
                };
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
              if (label === Entity.IDS.ORDER)
                searchAssets = ['orders'];
              if (label === Entity.IDS.SHIP)
                searchAssets = ['ships'];

              searchAssets.forEach((assetType) => {
                invalidations.push(['search', assetType])
              });
            }

            if (debugInvalidation) console.log('invalidate', invalidationConfig, invalidations);
            invalidations.forEach((queryKey) => {
              queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
              queryClient.refetchQueries({ queryKey, type: 'active' });
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
