import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroid = (i, extended = false) => {
  return useQuery(
    [ 'asteroids', i, extended || undefined ],
    () => api.getAsteroid(i, extended),
    { enabled: !!i }
  );
};

export default useAsteroid;
