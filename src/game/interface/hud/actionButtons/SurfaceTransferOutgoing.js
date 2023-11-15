import { useCallback, useMemo } from 'react';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton from './ActionButton';

const SurfaceTransferOutgoing = ({ asteroid, lot, onSetAction, preselect, _disabled }) => {
  const { currentDeliveryActions, isLoading } = useDeliveryManager({ origin: lot?.building || lot?.ship });
  const deliveryDeparting = useMemo(() => {
    return (currentDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [currentDeliveryActions]);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, preselect });
  }, [onSetAction, preselect]);

  const isEmpty = useMemo(() => {
    const hasMass = (lot?.building?.Inventories || []).find((i) => i.mass > 0);
    return !hasMass;
  }, [lot?.building?.inventories]);

  return (
    <ActionButton
      label={`Surface Transfer${isEmpty ? ' (inventory empty)' : ''}`}
      flags={{
        disabled: _disabled || isEmpty || isLoading || undefined,
        loading: deliveryDeparting || undefined
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransferOutgoing;