import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidLotData = (asteroidId) => {
  return useQuery(
    [ 'asteroidPackedLotData', asteroidId ],
    () => api.getAsteroidLotData(asteroidId),
    { enabled: !!asteroidId }
  );
};

export default useAsteroidLotData;
