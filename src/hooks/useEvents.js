import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import uniq from 'lodash.uniq';

import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';

const useEvents = () => {
  const { token } = useAuth();
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
      const newEvents = eventsQuery.data.slice().concat(events);
      setEvents(uniq(newEvents, 'transactionHash'));
      setLatest(Math.floor(Date.now() / 1000));
    }
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
