import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidShips = (i) => {
  return useQuery(
    [ 'ships', 'asteroid', i ],
    () => api.getAsteroidShips(i),
    { enabled: !!i }
  );
};

export default useAsteroidShips;
