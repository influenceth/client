import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroid = (i) => {
  return useQuery([ 'asteroids', i ], () => api.getAsteroid(i), { enabled: !!i });
};

export default useAsteroid;
