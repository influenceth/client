import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewMembers = (query) => {
  return useQuery(
    [ 'crewmembers', query ],
    () => api.getCrewMembers(query),
    { enabled: !!query }
  );
};

export default useCrewMembers;
