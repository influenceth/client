import { useCallback, useMemo } from 'react';
import { Inventory, Permission } from '@influenceth/sdk';

import { SwayIcon, TransferFromIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { locationsArrToObj } from '~/lib/utils';

const isVisible = ({ crew, lot, ship }) => {
  const entity = ship || lot?.surfaceShip || lot?.building;
  return crew && ((entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE));
};

const SurfaceTransferOutgoing = ({ asteroid, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const origin = useMemo(() => ship || lot?.surfaceShip || lot?.building, [ship, lot]);
  const { currentDeliveryActions, isLoading } = useDeliveryManager({ origin });
  const deliveryDeparting = useMemo(() => {
    return (currentDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [currentDeliveryActions]);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, origin, ...dialogProps });
  }, [onSetAction, dialogProps]);

  const disabledReason = useMemo(() => {
    if (!origin) return '';
    const _location = locationsArrToObj(origin.Location?.locations || []);
    if (!_location?.lotId) return 'not on surface';
    const hasMass = (origin.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0);
    if (!hasMass) return 'inventory empty';

    return getCrewDisabledReason({
      asteroid, crew, permission: Permission.IDS.REMOVE_PRODUCTS, permissionTarget: origin
    });
  }, [origin, crew]);

  return (
    <ActionButton
      label="Send From"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || isLoading,
        loading: deliveryDeparting
      }}
      icon={<TransferFromIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SurfaceTransferOutgoing, isVisible };
