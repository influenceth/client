import { useCallback, useMemo } from 'react';
import { Delivery } from '@influenceth/sdk';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton from './ActionButton';

// TODO: is this fully deprecated?
//       (below is how it was used in the old code)
// if ((lot.delivery || []).find((d) => d.delivery.Delivery.status !== Delivery.STATUSES.COMPLETE)) {
//   a.push(actionButtons.SurfaceTransferIncoming);
// }
const isVisible = () => false;

const SurfaceTransferIncoming = ({ lot, onSetAction, _disabled }) => {
  const incoming = useMemo(() => {
    return (lot?.deliveries || [])
      .filter((d) => d.Delivery.status !== Delivery.STATUSES.COMPLETE)
      .sort((a, b) => (a.Delivery.finishTime || 0) - (b.Delivery.finishTime || 0))
  }, [lot?.deliveries]);
  const nextIncoming = incoming?.length > 0 ? incoming[0] : null;
  const { deliveryStatus } = useDeliveryManager(lot?.id, nextIncoming?.id);
  
  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: nextIncoming?.id });
  }, [onSetAction, nextIncoming?.id]);

  if (!nextIncoming) return null;
  const isReadyToFinish = deliveryStatus === 'READY_TO_FINISH';
  return (
    <ActionButton
      label={`${deliveryStatus === 'READY_TO_FINISH' ? 'Finish' : 'Incoming'} Surface Transfer`}
      flags={{
        attention: isReadyToFinish,
        badge: !isReadyToFinish && incoming.length > 1 ? incoming.length : 0,
        disabled: _disabled,
        loading: !isReadyToFinish,
        finishTime: nextIncoming?.Delivery?.finishTime
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SurfaceTransferIncoming, isVisible };
