import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroid = (i) => {
  return useQuery(
    [ 'asteroid', i ],
    () => api.getAsteroid(i),
    {
      enabled: !!i,
      refetchInterval: 10000,
      refetchIntervalInBackground: true
    }
  );
};

export default useAsteroid;
