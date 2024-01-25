import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOrderSummaryByExchange = (asteroidId, product) => {
  return useQuery(
    [ 'exchangeOrderSummary', asteroidId, product ],
    () => api.getOrderSummaryByExchange(asteroidId, product),
    { enabled: !!asteroidId && !!product }
  );
};

export default useOrderSummaryByExchange;
