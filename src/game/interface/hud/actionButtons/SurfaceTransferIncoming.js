import { useCallback, useMemo } from 'react';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import ActionButton from './ActionButton';

const SurfaceTransferIncoming = ({ asteroid, lot, onSetAction, _disabled }) => {
  const incoming = useMemo(() => {
    return (lot?.deliveries || [])
      .filter((d) => d.Delivery.status !== Delivery.STATUSES.COMPLETE)
      .sort((a, b) => (a.Delivery.finishTime || 0) - (b.Delivery.finishTime || 0))
  }, [lot?.deliveries]);
  const nextIncoming = incoming?.length > 0 ? incoming[0] : null;
  const { deliveryStatus } = useDeliveryManager(asteroid?.i, lot?.i, nextIncoming?.id);
  
  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: nextIncoming?.id });
  }, [onSetAction, nextIncoming?.id]);

  if (!nextIncoming) return null;
  const isReadyToFinish = deliveryStatus === 'READY_TO_FINISH';
  return (
    <ActionButton
      label={`${deliveryStatus === 'READY_TO_FINISH' ? 'Finish' : 'Incoming'} Surface Transfer`}
      flags={{
        attention: isReadyToFinish || undefined,
        badge: !isReadyToFinish && incoming.length > 1 ? incoming.length : 0,
        disabled: _disabled || undefined,
        loading: !isReadyToFinish || undefined,
        finishTime: nextIncoming?.Delivery?.finishTime
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransferIncoming;