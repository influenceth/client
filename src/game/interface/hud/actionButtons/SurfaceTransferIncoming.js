import { useCallback, useMemo } from 'react';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import ActionButton from './ActionButton';

const SurfaceTransferIncoming = ({ asteroid, plot, onSetAction, _disabled }) => {
  const incoming = useMemo(() => {
    return (plot?.building?.deliveries || [])
      .filter((d) => d.status !== 'COMPLETE')
      .sort((a, b) => (a.completionTime || 0) - (b.completionTime || 0))
  }, [plot?.building?.deliveries]);
  const nextIncoming = incoming?.length > 0 ? incoming[0] : null;
  const { deliveryStatus } = useDeliveryManager(asteroid?.i, plot?.i, nextIncoming?.deliveryId);
  

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: nextIncoming?.deliveryId });
  }, [onSetAction, nextIncoming?.deliveryId]);

  if (!nextIncoming) return null;
  const isReadyToFinish = deliveryStatus === 'READY_TO_FINISH';
  return (
    <ActionButton
      label={`${deliveryStatus === 'READY_TO_FINISH' ? 'Finish' : 'Incoming'} Surface Transfer`}
      flags={{
        attention: isReadyToFinish || undefined,
        badge: !isReadyToFinish && incoming.length > 1 ? incoming.length : 0,
        disabled: _disabled || undefined,
        loading: !isReadyToFinish || undefined
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransferIncoming;