import { useQuery } from 'react-query';

import api from '~/lib/api';

const useSale = (assetType = 'Asteroid') => {
  return useQuery(['sale', assetType], () => api.getSale(assetType));
};

export default useSale;
