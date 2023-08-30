// 'ASTEROID_BASE_PRICE_ETH', 'ASTEROID_LOT_PRICE_ETH', 'ADALIAN_PRICE_ETH'

import { useQuery } from 'react-query';

import api from '~/lib/api';

const usePriceConstants = () => {
  // TODO: should we set this to get refetched on an interval?
  return useQuery(
    [ 'priceConstants' ],
    () => api.getConstants(['ASTEROID_BASE_PRICE_ETH', 'ASTEROID_LOT_PRICE_ETH', 'ADALIAN_PRICE_ETH']),
    {}
  );
};

export default usePriceConstants;
