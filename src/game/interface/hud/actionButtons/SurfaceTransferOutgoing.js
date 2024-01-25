import { useCallback, useMemo } from 'react';
import { Inventory } from '@influenceth/sdk';

import { SurfaceTransferIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { locationsArrToObj } from '~/lib/utils';

const isVisible = ({ crew, lot, ship }) => {
  const entity = lot?.building || ship;
  return crew
    // && entity?.Control?.controller?.id === crew.id  // TODO: policy instead?
    && entity?.Inventories?.find((i) => i.status === Inventory.STATUSES.AVAILABLE);
};

const SurfaceTransferOutgoing = ({ asteroid, crew, lot, ship, onSetAction, preselect, _disabled }) => {
  const { currentDeliveryActions, isLoading } = useDeliveryManager({ origin: lot?.building || lot?.surfaceShip });
  const deliveryDeparting = useMemo(() => {
    return (currentDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [currentDeliveryActions]);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, preselect });
  }, [onSetAction, preselect]);

  const disabledReason = useMemo(() => {
    const entity = lot?.building || ship;
    if (!entity) return '';
    const _location = locationsArrToObj(entity.Location?.locations || []);
    if (!_location?.lotId) return 'not on surface';
    const hasMass = (entity.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0);
    if (!hasMass) return 'inventory empty';
    return getCrewDisabledReason({ asteroid, crew });
  }, [lot?.building?.Inventories, crew?._ready]);

  return (
    <ActionButton
      label={`Surface Transfer`}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || isLoading,
        loading: deliveryDeparting
      }}
      icon={<SurfaceTransferIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SurfaceTransferOutgoing, isVisible };
