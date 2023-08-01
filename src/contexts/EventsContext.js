import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';

import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';

const getLinkedAsset = (linked, type) => {
  return linked.find((l) => l.type === type && !!l.asset)?.asset || {};
};

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
const getInvalidations = (event, returnValues, linked) => {
  let rewriteEvent;
  try {
    const map = {
      Asteroid_NameChanged: [
        ['asteroids', returnValues.tokenId],
        ['asteroids', 'list'],
        ['search', 'asteroids'],
        ['events'], // (to update name in already-fetched events)
        ['watchlist']
      ],
      Asteroid_ScanStarted: [
        ['actionItems'],
        ['asteroids', returnValues.asteroidId],
      ],
      // Asteroid_ScanFinished: [
      Asteroid_BonusesSet: [
        ['actionItems'],
        ['asteroids', returnValues.asteroidId],
        ['asteroids', 'list'],
        ['search', 'asteroids'],
        ['watchlist']
      ],
      Asteroid_Transfer: [
        ['asteroids', returnValues.tokenId],
        ['asteroids', 'ownedCount'],
        ['asteroids', 'list'],
        ['search', 'asteroids'],
      ],
      Crew_CompositionChanged: [
        ['crews', 'owned'],
      ],
      Crewmate_FeaturesSet: [
        ['assignments'],
        ['crewmates', returnValues.crewId],
        ['crewmates', 'owned'],
      ],
      Crewmate_TraitsSet: [
        ['crewmates', returnValues.crewId],
        ['crewmates', 'owned'],
      ],
      Crewmate_NameChanged: [
        ['crewmates', returnValues.tokenId],
        ['crewmates', 'owned'],
        ['events'], // (to update name in already-fetched events)
      ],
      Crewmate_Transfer: [
        ['assignments'],
        ['crewmates', 'owned'],
        ['crewmates', returnValues.tokenId],
      ],

      Dispatcher_ConstructionPlan: [
        ['planned'],
        ['lots', returnValues.asteroidId, returnValues.lotId],
        // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
      ],
      Dispatcher_ConstructionUnplan: [
        ['planned'],
        ['lots', returnValues.asteroidId, returnValues.lotId],
        // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
      ],
      Dispatcher_ConstructionStart: [
        ['planned'],
        ['actionItems'],
        ['lots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
      ],
      Dispatcher_ConstructionFinish: [
        ['actionItems'],
        ['lots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
      ],
      Dispatcher_ConstructionDeconstruct: [
        ['lots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
      ],

      Dispatcher_CoreSampleStartSampling: [
        ['actionItems'],
        ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
        ['lots', returnValues.asteroidId, returnValues.lotId],
      ],
      Dispatcher_CoreSampleFinishSampling: [
        ['actionItems'],
        ['lots', returnValues.asteroidId, returnValues.lotId],
      ],
      // (invalidations done in extractionStart)
      // CoreSample_Used: [
      //   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, getLinkedAsset(linked, 'Crew').i],
      //   ['lots', returnValues.asteroidId, returnValues.lotId],
      // ],
      Dispatcher_ExtractionStart: [
        ['actionItems'],
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
        ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
        ['lots', returnValues.asteroidId, returnValues.lotId],
        // ['lots', returnValues.asteroidId, returnValues.destinationLotId] // (this should happen in inventory_changed)
      ],
      Dispatcher_ExtractionFinish: [
        ['actionItems'],
        ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
        ['lots', returnValues.asteroidId, returnValues.lotId]
      ],

      Inventory_DeliveryStarted: [
        ['actionItems'],
        ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Inventory_DeliveryFinished: [
        ['actionItems'],
        ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Inventory_ReservedChanged: [
        ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
        ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
      ],
      Inventory_Changed: [
        ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
        ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
      ],
      // TODO: update crew and asteroid events to use Dispatcher_* events where possible
      // TODO: would be nice if the cached lot collections was somehow a collection of ['lots', asteroid.i, lot.i], so when we invalidate the relevant lot, the "collection" is updated
      // TODO: would be nice to replace the query results using the linked asset we've already been passed (where that is possible)
    }

    return map[rewriteEvent || event] || [];
  } catch (e) {/* no-op */}

  return [];
};

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
        else if (!!e.linked.find((l) => l.type === 'Crewmate')) eventName = 'Crewmate_Transfer';
        else if (!!e.linked.find((l) => l.type === 'Crew')) eventName = 'Crew_Transfer';
        else console.warn('unhandled transfer type', e);

      } else if (e.event === 'Nameable_NameChanged') {
        if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_NameChanged';
        else eventName = 'Crewmate_NameChanged';
      }

      // generate log events from events
      if (e.event === 'Crew_CompositionChanged') {
        new Set([...e.returnValues.oldCrew, ...e.returnValues.newCrew, '']).forEach((i) => { // the extra '' is in case both crews are empty
          transformedEvents.push({ ...e, event: eventName, i, key: `${e.id}_${i}` });
        });
      } else {
        transformedEvents.push({ ...e, event: eventName, key: e.id });
      }
    });

    // TODO: this timeout can be removed if/when we start optimistically updating query cache from
    //        the event's linked assets
    // (hopefully cure any race conditions)
    setTimeout(() => {
      transformedEvents.forEach(e => {
        if (!skipInvalidations) {
          const invalidations = [
            ...getInvalidations(e.event, e.returnValues, e.linked),
            ...(e.invalidations || [])
          ];
          // console.log('e.event', e.event, invalidations, e);

          invalidations.forEach((queryKey) => {

            // // // // //
            // TODO: vvv remove this when updating more systematically from linked data

            // if this event invalidates a Lot and has a linked Lot, use the linked Lot data
            // (but still also re-fetch the lot for sanity's sake)
            let optimisticUpdate = false;
            if (queryKey[0] === 'lots') {
              const [, asteroidId, lotId] = queryKey;
              const optimisticLot = e.linked
                .find(({ type, asset }) => type === 'Lot' && asset?.asteroid === asteroidId && asset?.i === lotId)
                ?.asset;
              if (optimisticLot) {
                const needsBuilding = !!optimisticLot.building;
                optimisticLot.building = e.linked
                  .find(({ type, asset }) => type === optimisticLot.building?.type && asset?.i === optimisticLot.building?.i)
                  ?.asset;
                if (!needsBuilding || !!optimisticLot.building) {
                  queryClient.setQueryData(queryKey, optimisticLot);
                  optimisticUpdate = true;
                }                
              }
            }
            // ^^^
            // // // // //

            if (!optimisticUpdate) {
              queryClient.invalidateQueries({ queryKey });
            }
          });
        }
      });

      setEvents((prevEvents) => uniq([
        ...transformedEvents,
        ...prevEvents
      ], 'key'));
    }, 1000);
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

      api.getEvents({ since }).then((eventData) => {
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
