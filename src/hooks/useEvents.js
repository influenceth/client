import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import uniq from 'lodash.uniq';

import useStore from '~/hooks/useStore';
import useAuth from '~/hooks/useAuth';
import api from '~/lib/api';

const useEvents = () => {
  const { token } = useAuth();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ latest, setLatest ] = useState(0);
  const [ events, setEvents ] = useState([]);

  const eventsQuery = useQuery(
    [ 'events', token ],
    () => api.getEvents(latest),
    {
      enabled: !!token,
      refetchInterval: 10000,
      refetchIntervalInBackground: true
    }
  );

  // Update for new incoming events
  useEffect(() => {
    if (eventsQuery.data) {
      // If not the initial query send off alerts for new events
      if (latest > 0) {
        eventsQuery.data.forEach(e => {
          const type = e.type || `${e.assetType}_${e.event}`;
          const alert = Object.assign({}, e, { type: type, duration: 5000 });
          createAlert(alert);
        });
      }

      const newEvents = eventsQuery.data.slice().concat(events);
      setEvents(uniq(newEvents, 'transactionHash'));
      setLatest(Math.floor(Date.now() / 1000));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ eventsQuery.data ]);

  // Reset on logout / disconnect
  useEffect(() => {
    if (!token) {
      setEvents([]);
      setLatest(0);
    }
  }, [ token ]);

  return { events, latest };
};

export default useEvents;
