import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

// cache by endpoint entity + status, filter before response
// (to avoid redundant cache data)
const useDeliveries = ({ destination, destinationSlot, origin, originSlot, status }) => {

  const cacheKey = useMemo(() => {
    const k = {};
    if (destination) k.destination = destination;
    if (origin) k.origin = origin;
    if (status) k.status = status;
    return k;
  }, [ destination, origin, status ]);

  const { data: rawData, ...queryProps } = useQuery(
    [ 'entities', Entity.IDS.DELIVERY, cacheKey ],
    () => api.getDeliveries(destination, origin, status),
    { enabled: !!(destination || origin) }
  );

  return useMemo(() => ({
    data: queryProps.isLoading ? undefined : (rawData || []).filter((d) => {
      if (destinationSlot && d.Delivery.destinationSlot !== destinationSlot) return false;
      if (originSlot && d.Delivery.originSlot !== originSlot) return false;
      return true;
    }),
    ...queryProps
  }), [rawData, queryProps]);
};

export default useDeliveries;
