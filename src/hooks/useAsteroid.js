import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroid = (id) => {
  return useQuery(
    [ 'asteroids', id ],
    () => api.getAsteroid(id),
    { enabled: !!id }
  );
};

export default useAsteroid;
