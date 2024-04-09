import { useCallback, useMemo } from 'react';
import { Inventory, Permission } from '@influenceth/sdk';

import { TransferP2PIcon, TransferToIcon } from '~/components/Icons';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { locationsArrToObj } from '~/lib/utils';
import useSession from '~/hooks/useSession';

const isVisible = ({ crew, lot, ship }) => {
  const entity = ship || lot?.surfaceShip || lot?.building;
  return crew && ((entity?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE));
};

const SurfaceTransferIncoming = ({ accountAddress, asteroid, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const destination = useMemo(() => ship || lot?.surfaceShip || lot?.building, [ship, lot]);
  const { currentDeliveryActions, isLoading } = useDeliveryManager({ destination });
  const deliveryDeparting = useMemo(() => {
    return (currentDeliveryActions || []).find((a) => a.status === 'DEPARTING');
  }, [currentDeliveryActions]);

  const handleClick = useCallback(() => {
    onSetAction('SURFACE_TRANSFER', { deliveryId: 0, destination, ...dialogProps });
  }, [onSetAction, dialogProps]);

  const disabledReason = useMemo(() => {
    if (!destination) return '';
    const _location = locationsArrToObj(destination.Location?.locations || []);
    if (!_location?.lotId) return 'not on surface';

    const hasCapacity = !!(destination?.Inventories || []).find((i) => {
      if (i.status === Inventory.STATUSES.AVAILABLE) {
        const invConfig = Inventory.getType(i?.inventoryType, crew?._inventoryBonuses) || {};
        const hasMassCapacity = invConfig.massConstraint > ((i.mass || 0) + (i.reservedMass || 0));
        const hasVolumeCapacity = invConfig.volumeConstraint > ((i.volume || 0) + (i.reservedVolume || 0));
        return (hasMassCapacity && hasVolumeCapacity);
      }
    });
    if (!hasCapacity) return 'over capacity';

    return getCrewDisabledReason({ accountAddress, asteroid, crew, requireReady: false });
  }, [accountAddress, destination, crew]);

  const isP2P = useMemo(() => !Permission.isPermitted(accountAddress, crew, Permission.IDS.ADD_PRODUCTS, destination), [accountAddress, crew, destination]);

  return (
    <ActionButton
      label="Send To"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || isLoading,
        loading: deliveryDeparting
      }}
      icon={isP2P ? <TransferP2PIcon /> : <TransferToIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SurfaceTransferIncoming, isVisible };
