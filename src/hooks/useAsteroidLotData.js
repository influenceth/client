import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidLotData = (id) => {
  return useQuery(
    [ 'asteroidLots', id ],
    () => api.getAsteroidLotData(id),
    { enabled: !!id }
  );
};

export default useAsteroidLotData;
