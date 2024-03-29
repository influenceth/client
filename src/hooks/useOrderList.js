import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOrderList = (exchange, product) => {
  return useQuery(
    [ 'orderList', product, exchange?.id ],
    () => api.getOrderList(exchange, product),
    { enabled: !!exchange?.id && !!product }
  );
};

export default useOrderList;
