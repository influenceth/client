import { createContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
const getInvalidations = (asset, event, data) => {
  try {
    return {
      Asteroid: {
        AsteroidScanned: [
          ['asteroids', data.asteroidId],
          ['asteroids', 'search'],
          ['watchlist']
        ],
        AsteroidUsed: [
          ['asteroids', 'mintableCrew'],
        ],
        NameChanged: [
          ['asteroids', data.asteroidId],
          ['asteroids', 'search'],
          ['events'], // (to update name in already-fetched events)
          ['watchlist']
        ],
        ScanStarted: [
          ['asteroids', data.asteroidId],
        ],
        Transfer: [
          ['asteroids', data.asteroidId],
          ['asteroids', 'mintableCrew'],
          ['asteroids', 'ownedCount'],
          ['asteroids', 'search'],
        ],
      },
      CrewMember: {
        NameChanged: [
          ['crew', data.crewId],
          ['crew', 'search'],
          ['events'], // (to update name in already-fetched events)
        ],
        Transfer: [
          ['assignments'],
          ['crew', 'search'],
        ],
      }
    }[asset][event];
  } catch (e) {/* no-op */}
  
  return [];
};

const EventsContext = createContext();

export function EventsProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ latest, setLatest ] = useState(0);
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const eventsQuery = useQuery(
    [ 'events', token ],
    () => api.getEvents(latest),
    {
      enabled: !!token,
      refetchInterval: 12500,
      refetchIntervalInBackground: true
    }
  );

  // Update for new incoming events
  useEffect(() => {
    if (eventsQuery.data) {

      // If not the initial query send off alerts for new events
      // and invalidate related data that should now be updated
      if (latest > 0) {
        eventsQuery.data.events.forEach(e => {
          getInvalidations(e.assetType, e.event, e.returnValues).forEach((i) => {
            queryClient.invalidateQueries(...i);
          });
          
          // alert
          const type = e.type || `${e.assetType}_${e.event}`;
          const alert = Object.assign({}, e, { type: type, duration: 5000 });
          createAlert(alert);
        });
      }

      const newEvents = eventsQuery.data.events.slice().concat(events);
      // TODO: should this uniquification include logIndex? some transactions now include multiple events
      setEvents(uniq(newEvents, 'transactionHash'));

      const latestEvent = newEvents.sort((a, b) => b.timestamp - a.timestamp)[0];
      setLatest(latestEvent?.timestamp ? latestEvent.timestamp + 1 : 0);
      setLastBlockNumber(eventsQuery.data.blockNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ eventsQuery.data ]);

  // Reset on logout / disconnect
  useEffect(() => {
    if (!token) {
      setEvents([]);
      setLastBlockNumber(0);
      setLatest(0);
    }
  }, [ token ]);

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
