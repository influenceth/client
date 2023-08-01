import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewmates = (ids) => {
  return useQuery(
    [ 'crewmates', ids.join(',') ],
    () => api.getCrewmates(ids),
    { enabled: ids?.length > 0 }
  );
};

export default useCrewmates;
