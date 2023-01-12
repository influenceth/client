import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';
import { io } from 'socket.io-client';
import { Capable } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const getLinkedAsset = (linked, type) => {
  return linked.find((l) => l.type === type)?.asset || {};
};

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
const getInvalidations = (event, returnValues, linked) => {
  let rewriteEvent;
  if (event === 'Nameable_NameChanged') {
    if (getLinkedAsset(linked, 'Asteroid').i) rewriteEvent = 'Asteroid_NameChanged';
    else rewriteEvent = 'Crewmate_NameChanged';
  }
  try {
    const map = {
      AsteroidUsed: [
        ['asteroids', 'mintableCrew'],
      ],
      Asteroid_NameChanged: [
        ['asteroids', returnValues.tokenId],
        ['asteroids', 'search'],
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
        ['asteroids', 'search'],
        ['watchlist']
      ],
      Asteroid_Transfer: [
        ['asteroids', returnValues.asteroidId],
        ['asteroids', 'mintableCrew'],
        ['asteroids', 'ownedCount'],
        ['asteroids', 'search'],
      ],
      Crew_CompositionChanged: [
        ['crews', 'owned'],
      ], 
      Crewmate_FeaturesSet: [
        ['crewmembers', returnValues.crewId],
        ['crewmembers', 'owned'],
      ],
      Crewmate_TraitsSet: [
        ['crewmembers', returnValues.crewId],
        ['crewmembers', 'owned'],
      ],
      Crewmate_NameChanged: [
        ['crewmembers', returnValues.tokenId],
        ['crewmembers', 'owned'],
        ['events'], // (to update name in already-fetched events)
      ],
      Crewmate_Transfer: [
        ['assignments'],
        ['crewmembers', 'owned'],
      ],

      Construction_Planned: [
        ['planned'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidPlots', returnValues.asteroidId]
      ],
      Construction_Unplanned: [
        ['planned'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidPlots', returnValues.asteroidId]
      ],
      Construction_Started: [
        ['planned'],
        ['actionItems'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
      ],
      Construction_Finished: [
        ['actionItems'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
      ],
      Construction_Deconstructed: [
        ['plots', returnValues.asteroidId, returnValues.lotId],
        ['asteroidPlots', returnValues.asteroidId]
      ],

      CoreSample_SamplingStarted: [
        ['actionItems'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
      ],
      CoreSample_SamplingFinished: [
        ['actionItems'],
        ['plots', returnValues.asteroidId, returnValues.lotId],
      ],
      CoreSample_Used: [
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Extraction_Started: [
        ['actionItems'],
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Extraction_Finished: [
        ['actionItems'],
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],

      Inventory_DeliveryStarted: [
        ['actionItems'],
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Inventory_DeliveryFinished: [
        ['actionItems'],
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Inventory_ReservedChanged: [
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      Inventory_Changed: [
        ['plots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
      ],
      // TODO: add this in: [ 'asteroidCrewPlots', asteroidId, crewId ],
      // TODO: would be nice if ^ was a collection of ['plots', asteroid.i, plot.i], so when we invalidate the relevant lot, the "collection" is updated
      // TODO: would be nice to replace the query results using the linked asset we've already been passed (where that is possible)
    }

    return map[rewriteEvent || event] || [];
  } catch (e) {/* no-op */}
  
  return [];
};

const EventsContext = createContext();

const ignoreEventTypes = ['CURRENT_ETHEREUM_BLOCK_NUMBER'];

export function EventsProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const pendingBlock = useRef();
  const pendingBlockEvents = useRef([]);
  const pendingTimeout = useRef();
  const socket = useRef();

  const handleEvents = useCallback((newEvents, skipInvalidations) => {
    const transformedEvents = [];
    newEvents.forEach((e) => {
      // TODO: ws-emitted events seem to have _id set instead of id
      if (e._id && !e.id) e.id = e._id;
      
      // rewrite eventNames as necessary (probably only ever needed for `Transfer`)
      let eventName = e.event;
      if (e.event === 'Transfer') {
        if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_Transfer';
        else if (!!e.linked.find((l) => l.type === 'CrewMember')) eventName = 'Crewmate_Transfer';
        else if (!!e.linked.find((l) => l.type === 'Crew')) eventName = 'Crew_Transfer';
        else console.warn('unhandled transfer type', e);
      }

      // generate log events from events
      if (e.event === 'Crew_CompositionChanged') {
        // the extra '' is in case both crews are empty
        new Set([...e.returnValues.oldCrew, ...e.returnValues.newCrew, '']).forEach((i) => {
          transformedEvents.push({ ...e, event: eventName, i, key: `${e.id}_${i}` });
        });

      // TODO: the reason we had to override these may no longer be relevant... review this:
      } else if (e.event === 'Lot_Used' && e.returnValues.capableType === 0) {
        transformedEvents.push({ ...e, event: 'Construction_Unplanned', key: e.id });
      } else if (e.event === 'Lot_Used' && Capable.TYPES[e.returnValues.capableType].category === 'Building') {
        transformedEvents.push({ ...e, event: 'Construction_Planned', key: e.id });
      } else if(!['Construction_Planned', 'Construction_Unplanned'].includes(e.event)) {
        transformedEvents.push({ ...e, event: eventName, key: e.id });
      }
    });

    transformedEvents.forEach(e => {
      if (!skipInvalidations) {
        // console.log('e.event', e.event);
        const invalidations = [
          ...getInvalidations(e.event, e.returnValues, e.linked),
          ...(e.invalidations || [])
        ];
        // console.log(e.event, e.returnValues, invalidations);
        invalidations.forEach((i) => {
          queryClient.invalidateQueries(...i);
        });
      }
    });

    setEvents((prevEvents) => uniq([
      ...transformedEvents,
      ...prevEvents
    ], 'key'));
  }, []);

  // try to process WS events grouped by block
  const processPendingWSBlock = useCallback(() => {
    if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    if (pendingBlockEvents.current.length > 0) {
      handleEvents([...pendingBlockEvents.current]);
      setLastBlockNumber((previousLast) => Math.max(pendingBlock.current, previousLast));
    }
    pendingBlockEvents.current = [];
  }, []);

  const onWSMessage = useCallback(({ type, body }) => {
    if (ignoreEventTypes.includes(type)) return;
    if (type === 'CURRENT_STARKNET_BLOCK_NUMBER') {
      setLastBlockNumber(body.blockNumber || 0);
    } else {
      // if this is a new block, process pending and schedule next processing block
      if (pendingBlock.current !== body.blockNumber) {
        pendingBlock.current = body.blockNumber || 0;

        processPendingWSBlock();
        pendingTimeout.current = setTimeout(() => {
          processPendingWSBlock();
        }, 1000);
      }
      // (queue the current event for processing)
      console.log({ ...body, event: type });
      pendingBlockEvents.current.push({ ...body, event: type });
    }
  }, []);

  useEffect(() => {
    // if authed, populate existing events and start listening to user websocket
    if (token) {
      api.getEvents(0).then((eventData) => {
        handleEvents(eventData.events, true);
        setLastBlockNumber(eventData.blockNumber);
      });

      socket.current = new io(process.env.REACT_APP_API_URL, {
        extraHeaders: { Authorization: `Bearer ${token}` }
      });
      socket.current.on('event', onWSMessage);
    }

    // reset on logout / disconnect
    return () => {
      setEvents([]);
      setLastBlockNumber(0);

      if (socket.current) {
        socket.current.off(); // removes all listeners for all events
        socket.current.disconnect();
      }
    }
  }, [token]);

  const subscribeToAsteroid = useCallback(() => {
    // TODO: ...
  }, []);

  const unsubscribeToAsteroid = useCallback(() => {
    // TODO: ...
  }, []);

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
