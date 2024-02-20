import { useCallback, useMemo } from 'react';
import { Inventory, Ship } from '@influenceth/sdk';

import { EmergencyModeEnterIcon, EmergencyModeExitIcon } from '~/components/Icons';
import useShip from '~/hooks/useShip';
import useShipEmergencyManager from '~/hooks/actionManagers/useShipEmergencyManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';

const isVisible = ({ crew, ship }) => {
  if (crew && ship && crew._location.shipId === ship.id) {
    // if already in emode, show so can toggle off
    if (ship.Ship.emergencyAt > 0) return true;

    // else, show if propellant is low
    // TODO: maybe always show
    const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
    const propellantInventoryMassMax = Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint;
    return (propellantInventory.mass <= 0.1 * propellantInventoryMassMax);
  }
  return false;
};

const EmergencyModeToggle = ({ crew, onSetAction, _disabled }) => {
  const manager = useShipEmergencyManager();
  const { data: crewedShip } = useShip(crew?._location?.shipId);
  const ready = useReadyAtWatcher(crewedShip?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction('EMERGENCY_MODE_TOGGLE');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!crewedShip) return 'ship is not crewed';
    if (crewedShip?._location.lotId || crewedShip?._location.spaceId) return 'must be in orbit';
    if (!ready) return 'ship is busy';
    return getCrewDisabledReason({ crew });
  }, [_disabled, crewedShip, ready]);

  return (
    <ActionButton
      label={`${crewedShip?.Ship?.emergencyAt > 0 ? 'Exit' : 'Enter'} Emergency Mode`}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason || undefined,
        loading: manager.isActivating || manager.isDeactivating,
      }}
      icon={crewedShip?.Ship?.emergencyAt > 0 ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EmergencyModeToggle, isVisible };
