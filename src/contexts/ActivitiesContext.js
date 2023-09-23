import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import getActivityConfig from '~/lib/activities';
import api from '~/lib/api';
import useCrewContext from '~/hooks/useCrewContext';

const getLinkedAsset = (linked, type) => {
  return linked.find((l) => l.type === type && !!l.asset)?.asset || {};
};

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
// TODO: would be nice if the cached lot collections was somehow a collection of ['lots', asteroid.i, lot.i], so when we invalidate the relevant lot, the "collection" is updated
// TODO: would be nice to replace the query results using the linked asset we've already been passed (where that is possible)

const ActivitiesContext = createContext();
const ignoreEventTypes = ['CURRENT_ETH_BLOCK_NUMBER'];

export function ActivitiesProvider({ children }) {
  const { token } = useAuth();
  const { crew } = useCrewContext();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ activities, setActivities ] = useState([]);

  const pendingTransactions = useStore(s => s.pendingTransactions);

  const pendingBatchActivities = useRef([]);
  const pendingTimeout = useRef();

  const handleActivities = useCallback((newActivities, skipInvalidations) => {
    const transformedActivities = newActivities.map((e) => {
      e.id = e.id || e._id;
      e.key = e.id;
      return e;
    });

    // (hopefully cure any race conditions with the setTimeout)
    // TODO: this timeout can be removed if/when we start optimistically updating query cache from
    //        the event's linked assets
    setTimeout(() => {
      transformedActivities.forEach(e => {
        const config = getActivityConfig(e);
        if (!config) return;

        if (!skipInvalidations) {
          config.getInvalidations().forEach((queryKey) => {
            console.log('invalidate', queryKey);

            // TODO: ecs refactor -- probably want to restore what this was doing below...

            // // // // // //
            // // TODO: vvv remove this when updating more systematically from linked data

            // // if this event invalidates a Lot and has a linked Lot, use the linked Lot data
            // // (but still also re-fetch the lot for sanity's sake)
            let optimisticUpdate = false;
            // if (queryKey[0] === 'lots') {
            //   const [, asteroidId, lotId] = queryKey;
            //   const optimisticLot = e.linked
            //     .find(({ type, asset }) => type === 'Lot' && asset?.asteroid === asteroidId && asset?.i === lotId)
            //     ?.asset;
            //   if (optimisticLot) {
            //     const needsBuilding = !!optimisticLot.building;
            //     optimisticLot.building = e.linked
            //       .find(({ type, asset }) => type === optimisticLot.building?.type && asset?.i === optimisticLot.building?.i)
            //       ?.asset;
            //     if (!needsBuilding || !!optimisticLot.building) {
            //       queryClient.setQueryData(queryKey, optimisticLot);
            //       optimisticUpdate = true;
            //     }                
            //   }
            // }
            // // ^^^
            // // // // // //

            if (!optimisticUpdate) {
              queryClient.invalidateQueries({ queryKey });
            }
          });
        }
      });

      setActivities((prevActivities) => uniq([
        ...transformedActivities,
        ...prevActivities
      ], 'key'));
    }, 1000);
  }, []);

  // try to process WS activities grouped by block
  const processPendingWSBatch = useCallback(() => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }

    const activitiesToProcess = (pendingBatchActivities.current || []).slice(0);
    pendingBatchActivities.current = [];
    
    if (activitiesToProcess.length > 0) {
      handleActivities(activitiesToProcess);
    }
  }, []);

  const onWSMessage = useCallback((message) => {
    console.log('onWSMessage', message);
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
      let since = null;
      if (pendingTransactions) {
        since = pendingTransactions.reduce((acc, cur) => {
          if (acc === null || cur.timestamp < acc) {
            return cur.timestamp;
          }
          return acc;
        }, null);
        if (since) since = Math.floor(since / 1000) - 300;  // 5m buffer as sanity-check
      }

      // TODO: ecs refactor -- re-enable since once server PR 266 merged in
      api.getActivities(/*since ? { since } : {}*/).then((data) => {
        // TODO: currently mapping activities to events so consistent with websockets
        //  but presumably websockets will start emitting activities in the future
        handleActivities(data.activities, true);
        setLastBlockNumber(data.blockNumber);
      });

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
