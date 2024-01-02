import { useCallback, useMemo } from 'react';
import { Inventory } from '@influenceth/sdk';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton from './ActionButton';

const SurfaceTransferOutgoing = ({ asteroid, crew, lot, onSetAction, preselect, _disabled }) => {
  const { currentDeliveryActions, isLoading } = useDeliveryManager({ origin: lot?.building || lot?.surfaceShip });
  const deliveryDeparting = useMemo(() => {
    return (currentDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [currentDeliveryActions]);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, preselect });
  }, [onSetAction, preselect]);

  const disabledReason = useMemo(() => {
    const entity = lot?.building || lot?.surfaceShip;
    const hasMass = (entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0);
    if (!hasMass) return 'inventory empty';
    if (!crew?._ready) return 'crew is busy';
    return '';
  }, [lot?.building?.Inventories, crew?._ready]);

  return (
    <ActionButton
      label={`Surface Transfer`}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || isLoading || undefined,
        loading: deliveryDeparting || undefined
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default SurfaceTransferOutgoing;