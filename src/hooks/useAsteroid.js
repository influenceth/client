import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroid = (i) => {
  return useQuery(
    [ 'asteroid', i ],
    () => api.getAsteroid(i),
    { enabled: !!i }
  );
};

export default useAsteroid;
