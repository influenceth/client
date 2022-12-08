import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';
import { io } from 'socket.io-client';
import { Capable } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';
import getLogContent from '~/lib/getLogContent';

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
const getInvalidations = (event, data) => {
  try {
    const map = {
      AsteroidUsed: [
        ['asteroids', 'mintableCrew'],
      ],
      Asteroid_NameChanged: [
        ['asteroids', data.asteroidId],
        ['asteroids', 'search'],
        ['events'], // (to update name in already-fetched events)
        ['watchlist']
      ],
      Asteroid_ScanStarted: [
        ['asteroids', data.asteroidId],
      ],
      Asteroid_ScanFinished: [
        ['asteroids', data.asteroidId],
        ['asteroids', 'search'],
        ['watchlist']
      ],
      Asteroid_Transfer: [
        ['asteroids', data.asteroidId],
        ['asteroids', 'mintableCrew'],
        ['asteroids', 'ownedCount'],
        ['asteroids', 'search'],
      ],
      Crew_CompositionChanged: [
        ['crews', 'owned'],
        // TODO: the following invalidations are probably now unnecessary since activeSlot was deprecated:
        // ['crewmembers', 'owned'],
        // [...(data.oldCrew || []), ...(data.newCrew || [])]
        //   .filter((v, i, a) => a.indexOf(v) === i)  // (unique)
        //   .map((i) => ['crew', i])
      ], 
      Crewmate_FeaturesSet: [
        ['crewmembers', data.crewId],
        ['crewmembers', 'owned'],
      ],
      Crewmate_TraitsSet: [
        ['crewmembers', data.crewId],
        ['crewmembers', 'owned'],
      ],
      Crewmate_NameChanged: [
        ['crewmembers', data.crewId],
        ['crewmembers', 'owned'],
        ['events'], // (to update name in already-fetched events)
      ],
      Crewmate_Transfer: [
        ['assignments'],
        ['crewmembers', 'owned'],
      ],

      Construction_Planned: [
        ['plots', data.asteroidId, data.lotId],
        ['asteroidPlots', data.asteroidId]
      ],
      Construction_Started: [
        ['plots', data.asteroidId, data.lotId],
      ],
      Construction_Finished: [
        ['plots', data.asteroidId, data.lotId],
      ],
    }
    return map[event] || [];
  } catch (e) {/* no-op */}
  
  return [];
};

const EventsContext = createContext();

const ignoreEventTypes = ['CURRENT_ETHEREUM_BLOCK_NUMBER'];

export function EventsProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const pendingBlock = useRef();
  const pendingBlockEvents = useRef([]);
  const pendingTimeout = useRef();
  const socket = useRef();

  const handleEvents = useCallback((newEvents, skipAlerts, skipInvalidations) => {
    const transformedEvents = [];
    newEvents.forEach((e) => {
      // rewrite eventNames as necessary (probably only ever needed for `Transfer`)
      let eventName = e.event;
      if (e.event === 'Transfer') {
        if (!!e.linked.find((l) => l.type === 'Crew')) eventName = 'Crew_Transfer';
        else if (!!e.linked.find((l) => l.type === 'CrewMember')) eventName = 'Crewmate_Transfer';
        else if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_Transfer';
        else console.warn('unhandled transfer type', e);
      }

      // generate log events from events
      if (e.event === 'Crew_CompositionChanged') {
        new Set([...e.returnValues.oldCrew, ...e.returnValues.newCrew]).forEach((i) => {
          transformedEvents.push({ ...e, event: eventName, i, key: `${e.id}_${i}` });
        });
      } else if (e.event === 'Lot_Used' && Capable.TYPES[e.returnValues.capableType].category === 'Building') {
        transformedEvents.push({ ...e, event: 'Construction_Planned', key: e.id });
      } else {
        transformedEvents.push({ ...e, event: eventName, key: e.id });
      }
    });

    transformedEvents.forEach(e => {
      if (!skipInvalidations) {
        // console.log('e.event', e.event);
        const invalidations = getInvalidations(e.event, e.returnValues);
        invalidations.forEach((i) => {
          queryClient.invalidateQueries(...i);
        });
      }
      
      if (!skipAlerts) {
        const type = e.type || e.event;
        const alert = Object.assign({}, e, { type: type, duration: 5000 });
        if (!!getLogContent({ type, data: alert })) createAlert(alert);
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
        handleEvents(eventData.events, true, true);
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
