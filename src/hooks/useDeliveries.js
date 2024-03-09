import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

// TODO: should this be useCrewDeliveries (and filter by crew-controlled deliveries)?
const useDeliveries = ({ destination, destinationSlot, origin, originSlot, deliveryId, status } = {}) => {
  // TODO: should consider using elasticsearch here instead so
  //  that can match on multiple fields (esp. status so not returning
  //  a bunch of completed deliveries that may not longer care about)
  //  ... just need to make sure elasticsearch is updated quickly enough

  const query = useMemo(() => {
    let builtQuery = null;

    if (deliveryId) {
      builtQuery = { ids: [deliveryId] };
    } else if (destination?.uuid) {
      builtQuery = { match: { 'Delivery.dest.uuid': destination.uuid }};
    } else if (origin?.uuid) {
      builtQuery = { match: { 'Delivery.origin.uuid': origin.uuid }};
    }

    if (builtQuery && status) builtQuery.match = Object.assign({ 'Delivery.status': status }, builtQuery.match);
    return builtQuery;
  }, [destination?.uuid, origin?.uuid, deliveryId]);

  return useQuery(
    [ 'entities', Entity.IDS.DELIVERY, query ],
    async () => {
      const deliveries = await api.getEntities({ label: Entity.IDS.DELIVERY, ...query });
      return deliveries.filter((d) => {
        if (destination?.uuid && d.Delivery.dest.uuid !== destination.uuid) return false;
        if (destinationSlot && d.Delivery.destSlot !== destinationSlot) return false;
        if (origin?.uuid && d.Delivery.origin.uuid !== origin.uuid) return false;
        if (originSlot && d.Delivery.originSlot !== originSlot) return false;
        return true;
      });
    },
    { enabled: !!query }
  );
};

export default useDeliveries;
