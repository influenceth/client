import { useQuery } from 'react-query';

import api from '~/lib/api';

const useSale = () => {
  return useQuery('sale', api.getSale);
};

export default useSale;
