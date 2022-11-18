import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';
import { io } from 'socket.io-client';

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
        ['crew', 'search'],
        [...(data.oldCrew || []), ...(data.newCrew || [])]
          .filter((v, i, a) => a.indexOf(v) === i)  // (unique)
          .map((i) => ['crew', i])
      ], 
      Crewmate_FeaturesSet: [
        ['crew', data.crewId],
        ['crew', 'search'],
      ],
      Crewmate_TraitsSet: [
        ['crew', data.crewId],
        ['crew', 'search'],
      ],
      Crewmate_NameChanged: [
        ['crew', data.crewId],
        ['crew', 'search'],
        ['events'], // (to update name in already-fetched events)
      ],
      Crewmate_Transfer: [
        ['assignments'],
        ['crew', 'search'],
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

  const socket = useRef();
  const wsShouldBeOpen = useRef();

  const handleEvents = useCallback((newEvents, skipAlerts, skipInvalidations) => {
    const transformedEvents = newEvents.map((e) => {
      let eventName = e.event;
      if (e.event === 'Transfer') {
        if (!!e.linked.find((l) => l.type === 'CrewMember')) eventName = 'Crewmate_Transfer';
        else if (!!e.linked.find((l) => l.type === 'Asteroid')) eventName = 'Asteroid_Transfer';
        else console.error('unhandled transfer type', e);
      }
      return { ...e, event: eventName };
    });
    console.log(transformedEvents);

    transformedEvents.forEach(e => {
      if (!skipInvalidations) {
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
    ], '_id'));
  }, []);

  const onWSMessage = useCallback(({ type, body }) => {
    if (ignoreEventTypes.includes(type)) return;
    if (type === 'CURRENT_STARKNET_BLOCK_NUMBER') {
      setLastBlockNumber(body.blockNumber || 0);
    } else {
      handleEvents([{ ...body, event: type }]);
      setLastBlockNumber(Math.max(body.blockNumber, lastBlockNumber));
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

      wsShouldBeOpen.current = false;
      if (socket.current) {
        socket.current.off(); // removes all listeners for all events
        socket.current.disconnect();
      }
    }
  }, [token]);

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
