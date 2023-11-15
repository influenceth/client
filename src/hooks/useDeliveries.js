import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Delivery, Entity } from '@influenceth/sdk';

import api from '~/lib/api';

// TODO: should this be useCrewDeliveries (and filter by crew-controlled deliveries)?
const useDeliveries = ({ destination, destinationSlot, origin, originSlot, deliveryId }) => {
  // TODO: should consider using elasticsearch here instead so
  //  that can match on multiple fields (esp. status so not returning
  //  a bunch of completed deliveries that may not longer care about)
  //  ... just need to make sure elasticsearch is updated quickly enough

  const query = useMemo(() => {
    if (deliveryId) {
      return { ids: [deliveryId] };
    } else if (destination) {
      const { id, label } = destination;
      return { match: { 'Delivery.dest': { id, label } } };
    } else if (origin) {
      const { id, label } = origin;
      return { match: { 'Delivery.origin': { id, label } } };
    }
    return null;
  }, [destination, origin, deliveryId]);

  return useQuery(
    [ 'entities', Entity.IDS.DELIVERY, query ],
    async () => {
      const deliveries = await api.getEntities({ label: Entity.IDS.DELIVERY, ...query });
      return deliveries.filter((d) => {
        if (destination && d.Delivery.dest.id !== destination.id) return false;
        if (destinationSlot && d.Delivery.destSlot !== destinationSlot) return false;
        if (origin && d.Delivery.origin.id !== origin.id) return false;
        if (originSlot && d.Delivery.originSlot !== originSlot) return false;
        return true;
      });
    },
    { enabled: !!query }
  );
};

export default useDeliveries;
