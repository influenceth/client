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

    // show if food is low
    if (crew?._foodBonuses < 1) return true;

    // show if propellant is low
    const shipConfig = Ship.TYPES[ship.Ship.shipType];
    const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
    const propellantInventoryMassMax = Inventory.getType(propellantInventory?.inventoryType, crew._inventoryBonuses)?.massConstraint;
    return (propellantInventory.mass <= shipConfig.emergencyPropellantCap * propellantInventoryMassMax);
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
