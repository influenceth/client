import { useCallback, useMemo } from 'react';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import ActionButton from './ActionButton';

const SurfaceTransferOutgoing = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { deliveryStatus } = useDeliveryManager(asteroid?.i, plot?.i);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0 });
  }, [onSetAction]);

  const disabled = useMemo(() => {
    const hasMass = Object.values(plot?.building?.inventories || {}).find((i) => i.mass > 0);
    return !hasMass;
  }, [plot?.building?.inventories]);

  return (
    <ActionButton
      label={`Surface Transfer${disabled ? ' (inventory empty)' : ''}`}
      flags={{
        disabled: _disabled || disabled || undefined,
        loading: (deliveryStatus === 'DEPARTING') || undefined
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransferOutgoing;