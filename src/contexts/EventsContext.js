import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';
import { Capable } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';

const getLinkedAsset = (linked, type) => {
  return linked.find((l) => l.type === type && !!l.asset)?.asset || {};
};

// TODO:
//  * asteroid reloads when replaced from linked (causes it to disappear and reload)
//    ^ can we just traverse and update keys instead? or figure out what is being listened to in Asteroid that is causing this
//  * same asteroid reload issue also causes reload of packed lot data from server
//  * create duplicate logs from Crew_CompositionChanged in activity log instead of here

//  - test all events --> invalidations (and updates of aggregates)

//  - test that Asteroid.events (and any other *.events) is being updated as much as ever
//    AND that events data is included in the `linked` updates

//  - how to handle ['asteroid', 'search'] (esp. as it relates to my owned assets)
//    ^ THESE ARE NOT HYDRATED and the info returned is not ever update-able
//      if they are not hydrated. however, the search results may change acc.
//      to updates
//    ^ see useAsteroids, usePageAsteroids, watchlist

//  - probably move 'extended' asteroid data usage into scanManager and only in scanManager
//    (should only use immutable boost, etc data from that call, so doesn't need to be invalidated)
//    (should also refresh from inside that component (remove from below))

//  - (v2) custom code for each aggregate / event combo to determine when can mutate
//    aggregate keys without invalidating aggregate

// TODO: work through asteroid websocket room events and decide how
//  want to incorporate those here


const updateCacheQueryData = ({ event, returnValues, linked }, queryClient) => {
  let invalidations = [];

  switch(event) {
    case 'Asteroid_NameChanged':
      invalidations = [
        ['asteroid', returnValues.tokenId]
      ];
    break;

    case 'Asteroid_Transfer':
      invalidations = [
        ['asteroid', returnValues.tokenId],
        ['asteroids', 'owned'],
      ];
    break;

    case 'Dispatcher_AsteroidStartScan':
    case 'Dispatcher_AsteroidFinishScan':
      invalidations = [
        ['asteroid', returnValues.asteroidId, true],  // NOTE: scan manager uses extended (should potentially just keep this in scan manager context and reload from there); also, Finished action may not need to update this one anyway
        ['asteroid', returnValues.asteroidId],
        ['actionItems'],
      ];
    break;

    case 'Crew_CompositionChanged':
      invalidations = [
        ['crews', 'owned'],
      ];
    break;

    case 'Crewmate_Transfer':
      invalidations = [
        ['crewmember', returnValues.tokenId || returnValues.crewmateId ],
        ['crewmembers', 'owned'],
      ];
    break;

    case 'Crewmate_FeaturesSet':
    case 'Crewmate_NameChanged':
    case 'Crewmate_TraitsSet':
      invalidations = [
        ['crewmember', returnValues.tokenId || returnValues.crewmateId ],
      ];
    break;

    case 'Dispatcher_ConstructionPlan':
    case 'Dispatcher_ConstructionUnplan':
      invalidations = [
        ['plot', returnValues.asteroidId, returnValues.lotId],
        ['plots', 'planned', returnValues.crewId],
        ['plots', 'occupied', returnValues.asteroidId, returnValues.crewId]
      ];
    break;

    case 'Dispatcher_ConstructionStart':
    case 'Dispatcher_ConstructionDeconstruct':
      invalidations = [
        ['plot', returnValues.asteroidId, returnValues.lotId],
        ['plots', 'planned', returnValues.crewId],
        ['actionItems'],
      ];
    break;

    case 'Dispatcher_CoreSampleStartSampling':
    case 'Dispatcher_ExtractionStart':
      invalidations = [
        ['plot', returnValues.asteroidId, returnValues.lotId],
        ['plots', 'sampled', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
        ['actionItems'],
      ];
    break;

    case 'Dispatcher_ConstructionFinish':
    case 'Dispatcher_CoreSampleFinishSampling':
    case 'Dispatcher_ExtractionFinish':
      invalidations = [
        ['plot', returnValues.asteroidId, returnValues.lotId],
        ['actionItems']
      ];
    break;

    // TODO: review this change to Dispatcher_* events
    //        > the lot is probably ambiguous on these, but perhaps we can get the values from returnValues
    case 'Dispatcher_InventoryTransferStart':
    case 'Dispatcher_InventoryTransferFinish':
      invalidations = [
        ['plot', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
        ['actionItems'],
      ];
    break;

    case 'Inventory_ReservedChanged':
    case 'Inventory_Changed':
      invalidations = [
        ['plot', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
      ];
    break;
  }

  console.log('-- EVENT --', event)
  console.log('must invalidate', [ ...invalidations ]);

  // linked roll-up (only replace lots if can populate the linked lot with any needed linked building)
  //    make all linked updates to 'asteroid' and 'asteroids' if key is present in cache
  //    remove invalidations if there is an individual hit from linked data
  const safeLinked = [];
  linked.forEach((l) => {
    if (l.type === 'Lot') {
      const needsBuilding = !!l.asset.building;
      l.asset.building = linked.find(({ type, asset }) => type === l.asset.building?.type && asset.i === l.asset.building?.i)?.asset;
      if (!needsBuilding || l.asset.building) {
        safeLinked.push(l);
      } else {
        console.log('missing linked building', { event, returnValues, linked });
      }

    // other noted linked types (not sure which are actually implemented on backend):
    // 'CoreSample', 'Crew','Crossing', 'Referral', 'Sale', 'User', (...buildings)
    } else if (['Asteroid','CrewMember'].includes(l.type)) {
      safeLinked.push(l);
    }
  });

  console.log('safeLinked', safeLinked);

  // replace linked data into individual record (this will automatically update where referenced by aggs)
  // cancel invalidation of individual records where linked successfully
  const alreadyInvalidated = [];
  safeLinked.forEach(({ type, asset }) => {
    let linkedQueryKey;
    if (type === 'Asteroid') {
      linkedQueryKey = ['asteroid', asset.i];
    } else if (type === 'Lot') {
      linkedQueryKey = ['plot', asset.asteroid, asset.i];
    } else if (type === 'CrewMember') {
      linkedQueryKey = ['crewmember', asset.i];
    }
    if (linkedQueryKey) {
      // update query cache for linked item
      console.log('update', linkedQueryKey, asset);
      queryClient.setQueryData(linkedQueryKey, asset);

      // if this key was in list of pending invalidations, remove it (no longer need to refetch)
      const skipInvalidation = invalidations.find((invkey) => {
        return invkey.reduce((acc, part, k) => acc && part === linkedQueryKey[k], true)
      });
      if (skipInvalidation) {
        console.log('in skip', skipInvalidation.join(','));
        alreadyInvalidated.push(skipInvalidation.join(','));
      }
    }
  });

  // invalidate whatever wasn't already replaced by linked
  invalidations.forEach((queryKey) => {
    if (!alreadyInvalidated.includes(queryKey.join(','))) {
      console.log('invalidating', queryKey);
      queryClient.invalidateQueries({ queryKey });
    }
  });

}

const EventsContext = createContext();
const ignoreEventTypes = ['CURRENT_ETH_BLOCK_NUMBER'];

export function EventsProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const pendingTransactions = useStore(s => s.pendingTransactions);

  const pendingBlock = useRef();
  const pendingBlockEvents = useRef([]);
  const pendingTimeout = useRef();

  const handleEvents = useCallback((newEvents, skipInvalidations) => {
    const transformedEvents = [];
    newEvents.forEach((e) => {
      // TODO: ws-emitted events seem to have _id set instead of id
      if (e._id && !e.id) e.id = e._id;

      // rewrite eventNames as necessary
      let eventName = e.event;
      if (e.event === 'Transfer') {
        if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_Transfer';
        else if (!!e.linked.find((l) => l.type === 'CrewMember')) eventName = 'Crewmate_Transfer';
        else if (!!e.linked.find((l) => l.type === 'Crew')) eventName = 'Crew_Transfer';
        else console.warn('unhandled transfer type', e);

      } else if (e.event === 'Nameable_NameChanged') {
        if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_NameChanged';
        else eventName = 'Crewmate_NameChanged';
      }

      // generate log events from events
      // TODO: shuold probably split this in activity log rather than here
      if (e.event === 'Crew_CompositionChanged') {
        new Set([...e.returnValues.oldCrew, ...e.returnValues.newCrew, '']).forEach((i) => { // the extra '' is in case both crews are empty
          transformedEvents.push({ ...e, event: eventName, i, key: `${e.id}_${i}` });
        });
      } else {
        transformedEvents.push({ ...e, event: eventName, key: e.id });
      }
    });

    // update / invalidation query cache
    if (!skipInvalidations) {
      transformedEvents.forEach(e => {
        updateCacheQueryData(e, queryClient);
      });
    }

    // update events
    setEvents((prevEvents) => uniq([
      ...transformedEvents,
      ...prevEvents
    ], 'key'));
  }, []);

  // try to process WS events grouped by block
  const processPendingWSBlock = useCallback(() => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }

    const eventsToProcess = (pendingBlockEvents.current || []).slice(0);
    pendingBlockEvents.current = [];
    
    if (eventsToProcess.length > 0) {
      handleEvents(eventsToProcess);
      setLastBlockNumber((previousLast) => Math.max(pendingBlock.current, previousLast));
    }
  }, []);

  const onWSMessage = useCallback(({ type, body }) => {
    if (ignoreEventTypes.includes(type)) return;
    if (type === 'CURRENT_STARKNET_BLOCK_NUMBER') {
      setLastBlockNumber(body.blockNumber || 0);
    } else {
      // if this is a new block, go ahead and process pending block first
      if (pendingBlock.current !== body.blockNumber) {
        pendingBlock.current = body.blockNumber || 0;
        processPendingWSBlock();
      }

      // queue the current event for processing
      pendingBlockEvents.current.push({ ...body, event: type });

      // schedule processing for now + 1s (in case more events are coming from this block)
      // NOTE: if we ever limit the number of events emitted per action, we can remove this batching
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
      pendingTimeout.current = setTimeout(processPendingWSBlock, 1000);
    }
  }, []);

  useEffect(() => {
    if (!wsReady) return;

    // if authed, populate existing events and start listening to user websocket
    // if have pending transactions, load back to the oldest one in case it missed the event;
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
        if (since) since = Math.floor(since / 1000);
      }

      api.getEvents(since).then((eventData) => {
        handleEvents(eventData.events, true);
        setLastBlockNumber(eventData.blockNumber);
      });
      registerWSHandler(onWSMessage);
    }

    // reset on logout / disconnect
    return () => {
      setEvents([]);
      setLastBlockNumber(0);
      unregisterWSHandler();
    }
  }, [onWSMessage, token, wsReady]);

  return (
    <EventsContext.Provider value={{
      lastBlockNumber,
      events
    }}>
      {children}
    </EventsContext.Provider>
  );
};

export default EventsContext;
