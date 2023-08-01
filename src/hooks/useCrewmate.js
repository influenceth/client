import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewmate = (i) => {
  return useQuery(
    [ 'crewmates', i ],
    () => api.getCrewmate(i),
    { enabled: !!i }
  );
};

export default useCrewmate;
