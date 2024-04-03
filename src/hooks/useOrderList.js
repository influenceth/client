import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOrderList = (exchangeId, productId) => {
  return useQuery(
    [ 'orderList', exchangeId, productId ],
    () => api.getOrderList(exchangeId, productId),
    { enabled: !!exchangeId && !!productId }
  );
};

export default useOrderList;
