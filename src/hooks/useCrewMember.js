import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewMember = (i) => {
  return useQuery(
    [ 'crew', i ],
    () => api.getCrewMember(i),
    { enabled: !!i }
  );
};

export default useCrewMember;
