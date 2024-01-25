import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewOrders = (crewId) => {
  return useQuery(
    // TODO: convert this to 'entities' model of cache keys?
    [ 'crewOpenOrders', crewId ],
    () => api.getCrewOpenOrders(crewId),
    { enabled: !!crewId }
  );
};

export default useCrewOrders;
