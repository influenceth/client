import { useContext } from 'react';

import EventsContext from '~/contexts/EventsContext';

const useEvents = () => {
  return useContext(EventsContext);
};

export default useEvents;
