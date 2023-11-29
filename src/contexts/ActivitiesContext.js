import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';

import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
// TODO: would be nice if the cached lot collections was somehow a collection of ['lots', asteroid.id, lot.id], so when we invalidate the relevant lot, the "collection" is updated
// TODO: would be nice to replace the query results using the linked asset we've already been passed (where that is possible)

const ActivitiesContext = createContext();
const ignoreEventTypes = ['CURRENT_ETH_BLOCK_NUMBER'];

export function ActivitiesProvider({ children }) {
  const { token } = useAuth();
  const { crew, refreshReadyAt } = useCrewContext();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ activities, setActivities ] = useState([]);

  const pendingTransactions = useStore(s => s.pendingTransactions);

  const pendingBatchActivities = useRef([]);
  const pendingTimeout = useRef();

  const handleActivities = useCallback((newActivities, skipInvalidations) => {

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
          const activityConfig = getActivityConfig(activity);
          shouldRefreshReadyAt = shouldRefreshReadyAt || !!activityConfig?.requiresCrewTime;

          // console.log('invalidations', activityConfig?.invalidations);
          (activityConfig?.invalidations || []).forEach((queryKey) => {

            // if this is invalidation of a single entity, search for any ['entities', label, *] collections
            // that include the id and invalidate those as well (if none found, invalidate all since probably
            // a new entity in that case)
            // TODO: with a more formulaic 'entities' caching structure, may be able to replace in-place in the
            //  future, but that gets pretty complicated with in the case of new/removed entries
            if (queryKey[0] === 'entity' && queryKey[2]) {
              let foundSomewhere = false;
              const collectionQueryKey = ['entities', queryKey[1]];
              const labelCollections = queryClient.getQueriesData(collectionQueryKey);
              labelCollections.forEach(([collectionQueryKey, collectionData]) => {
                const found = (collectionData || []).find((e) => e.id === queryKey[2]);
                if (found) {
                  queryClient.invalidateQueries({ queryKey: collectionQueryKey, refetchType: 'none' });
                  queryClient.refetchQueries({ queryKey: collectionQueryKey, type: 'active' });
                  foundSomewhere = true;
                }
              });

              // if not found, we invalidate all collections of label since this is probably a new entity
              if (!foundSomewhere) {
                // TODO: there is an argument for loading the entity in this case, replacing in-place in
                // its own query key, then figuring out which lot should actually reload all for (since
                // this invalidation may result in lots of requests)... but we would need a more explicit 'entities'
                // caching key structure -- this is not just for 'lot' based collections!
                queryClient.invalidateQueries({ queryKey: collectionQueryKey, refetchType: 'none' });
                queryClient.refetchQueries({ queryKey: collectionQueryKey, type: 'active' });
              }

            } else {
              // invalidation seems to refetch very inconsistently... so we try to invalidate all, but refetch active explicitly
              // TODO: search "joined key" -- these queryKeys cause inefficiency because may be refetched after actually inactive here...
              //  we should ideally collapse those into named queries where possible (as long as can still trigger updates accurately)
              queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
              queryClient.refetchQueries({ queryKey, type: 'active' });
            }
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
  }, [refreshReadyAt]);

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
  }, []);

  const onWSMessage = useCallback((message) => {
    if (process.env.NODE_ENV !== 'production') console.log('onWSMessage', message);
    const { type, body } = message;
    if (ignoreEventTypes.includes(type)) return;
    if (type === 'CURRENT_STARKNET_BLOCK_NUMBER') {
      setLastBlockNumber(body.blockNumber || 0);
    } else {

      // queue the current activity for processing
      pendingBatchActivities.current.push(body);

      // schedule processing for now + 1s (in case more activities are coming from this block)
      // NOTE: if we ever limit the number of activities emitted per action, we can remove this batching
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
      pendingTimeout.current = setTimeout(processPendingWSBatch, 1000);
    }
  }, []);

  useEffect(() => {
    if (!wsReady) return;
    let crewRoom = null;

    // if authed, populate existing activities and start listening to user websocket
    // if have pending transactions, load back to the oldest one in case it missed the activity;
    // else, will just pull most recent X (limit set on server)
    if (token) {
      const pendingTxHashes = pendingTransactions
        .map((tx) => tx.txHash)
        .filter((txHash) => !!txHash);
      if (pendingTxHashes?.length > 0) {
        // NOTE: since is to make sure no pagination occurs... we should fix this endpoint on the server
        api.getTransactionActivities(pendingTxHashes).then(async (data) => {
          await hydrateActivities(data.activities, queryClient);
          handleActivities(data.activities, true);
          setLastBlockNumber(data.blockNumber);
        });
      } else {
        handleActivities([], true);
      }

      registerWSHandler(onWSMessage);

      crewRoom = crew?.id ? `Crew::${crew.id}` : null;
      if (crewRoom) registerWSHandler(onWSMessage, crewRoom);
    }

    // reset on logout / disconnect
    return () => {
      setActivities([]);
      setLastBlockNumber(0);
      unregisterWSHandler();
      if (crewRoom) unregisterWSHandler(crewRoom);
    }
  }, [crew?.id, onWSMessage, token, wsReady]);

  return (
    <ActivitiesContext.Provider value={{
      lastBlockNumber,
      activities
    }}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export default ActivitiesContext;
