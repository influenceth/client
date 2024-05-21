import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidSale = () => {
  return useQuery(
    ['asteroidSale'],
    () => api.getAsteroidSale(),
  );
};

export default useAsteroidSale;
