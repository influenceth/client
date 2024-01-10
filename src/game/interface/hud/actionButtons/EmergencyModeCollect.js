import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crewmate, Inventory, Product, Ship, Time } from '@influenceth/sdk';

import { EmergencyModeCollectIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { getCrewAbilityBonuses } from '~/lib/utils';

const resourceId = Product.IDS.HYDROGEN_PROPELLANT;

const isVisible = ({ crew, ship }) => {
  return crew && ship
    && crew._location.shipId === ship.id
    && ship.Ship.emergencyAt > 0;
};

const EmergencyModeCollect = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { data: ship } = useShip(crew?._location?.shipId)

  const handleClick = useCallback(() => {
    onSetAction('EMERGENCY_MODE_COLLECT');
  }, [onSetAction]);

  const [hasGeneratedMax, setHasGeneratedMax] = useState();

  const {
    hasCollectedMax,
    finishTime,
  } = useMemo(() => {
    const inventoryBonus = getCrewAbilityBonuses(Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY, crew);
    const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
    const propellantInventoryConfig = Inventory.getType(propellantInventory.inventoryType, inventoryBonus.totalBonus);
    const startingAmount = propellantInventory.mass / Product.TYPES[resourceId].massPerUnit;
    const maxTankAmount = propellantInventoryConfig.massConstraint / Product.TYPES[resourceId].massPerUnit;
    const maxEmergencyAmount = Ship.EMERGENCY_PROP_LIMIT * maxTankAmount;    
    const finishTime = (ship?.Ship?.emergencyAt || 0) + Time.toRealDuration(
      Ship.getTimeUntilEmergencyPropellantFull(propellantInventoryConfig, startingAmount),
      crew?._timeAcceleration
    );
    return {
      hasCollectedMax: startingAmount >= maxEmergencyAmount,
      finishTime,
    };
  }, [crew, resourceId, ship]);

  useEffect(() => {
    const now = Date.now() / 1000;
    if (finishTime > now) {
      setHasGeneratedMax(false);
      const to = setTimeout(() => {
        setHasGeneratedMax(true);
      }, 1000 * (finishTime - now));
      return () => clearTimeout(to);
    } else {
      setHasGeneratedMax(true);
    }
  }, [finishTime]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!ship) return 'ship is not crewed';
    if (hasCollectedMax) return 'max reached';
    return getCrewDisabledReason({ crew });
  }, [_disabled, crew, hasCollectedMax, ship]);

  return (
    <ActionButton
      label="Collect Emergency Propellant"
      labelAddendum={disabledReason || (hasGeneratedMax ? undefined : 'generating...')}
      flags={{
        attention: hasGeneratedMax && !hasCollectedMax,
        disabled: disabledReason,
        loading: (!disabledReason && !hasGeneratedMax),
        finishTime
      }}
      icon={<EmergencyModeCollectIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EmergencyModeCollect, isVisible };