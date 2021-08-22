import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewMember = (i) => {
  return useQuery(
    [ 'crewMember', i ],
    () => api.getCrewMember(i),
    { enabled: !!i }
  );
};

export default useCrewMember;
