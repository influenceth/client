import { createContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import uniq from 'lodash.uniqby';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';
import getLogContent from '~/lib/getLogContent';

// TODO (enhancement): rather than invalidating, make optimistic updates to cache value directly
// (i.e. update asteroid name wherever asteroid referenced rather than invalidating large query results)
const getInvalidations = (asset, event, data) => {
  try {
    const map = {
      Asteroid: {
        AsteroidScanned: [
          ['asteroids', data.asteroidId],
          ['asteroids', 'search'],
          ['watchlist']
        ],
        AsteroidUsed: [
          ['asteroids', 'mintableCrew'],
        ],
        Asteroid_NameChanged: [
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
        Transfer: [
          ['assignments'],
          ['crew', 'search'],
        ],
      }
    }
    return map[asset][event] || [];
  } catch (e) {/* no-op */}
  
  return [];
};

const EventsContext = createContext();

export function EventsProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ latest, setLatest ] = useState(-1);
  const [ lastBlockNumber, setLastBlockNumber ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const eventsQuery = useQuery(
    [ 'events', token ],
    () => api.getEvents(Math.max(latest, 0)),
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
      if (latest > -1) {
        eventsQuery.data.events.forEach(e => {
          const invalidations = getInvalidations(e.assetType, e.event, e.returnValues);
          console.log('e.event', e.event, invalidations);
          invalidations.forEach((i) => {
            queryClient.invalidateQueries(...i);
          });
          
          // alert
          const type = e.type || `${e.assetType}_${e.event}`;
          const alert = Object.assign({}, e, { type: type, duration: 5000 });
          if (!!getLogContent({ type, data: alert })) createAlert(alert);
        });
      }

      const newEvents = eventsQuery.data.events.slice().concat(events);
      setEvents(uniq(newEvents, (x) => `${x.transactionHash}.${x.logIndex}.${x.i}`));

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
      setLatest(-1);
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
