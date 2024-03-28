import { useQuery } from 'react-query';
import { Entity, Order } from '@influenceth/sdk';

import api from '~/lib/api';

const useCrewOrders = (controllerId) => {
  return useQuery(
    [ 'entities', Entity.IDS.ORDER, { controllerId, status: Order.STATUSES.OPEN } ],
    () => api.getCrewOpenOrders(controllerId),
    { enabled: !!controllerId }
  );
};

export default useCrewOrders;
