import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useOrderList = (exchangeId, productId) => {
  return useQuery(
    [ 'entities', Entity.IDS.ORDER, { exchangeId, productId } ],
    () => api.getOrderList(exchangeId, productId),
    { enabled: !!exchangeId && !!productId }
  );
};

export default useOrderList;
