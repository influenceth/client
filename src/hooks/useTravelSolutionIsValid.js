import { useMemo } from 'react';
import { Ship, Time } from '@influenceth/sdk';

import useCrewContext from './useCrewContext';
import useShip from './useShip';
import useStore from './useStore';

export const maxFoodUtilizationAdays = 1.5 * 365; // 1.5 years

const useTravelSolutionIsValid = () => {
  const { crew } = useCrewContext();
  const { data: ship } = useShip(crew?._location?.shipId);

  const travelSolution = useStore(s => s.asteroids.travelSolution);

  return useMemo(() => {
    if (!travelSolution) return false;
    if (travelSolution._isSimulation) return !travelSolution._isSimulationInvalid;

    if (!crew || !ship) return false;
  
    const shipConfig = Ship.TYPES[ship?.Ship?.shipType];
  
    const cargoInventory = ship.Inventories.find((i) => i.slot === shipConfig.cargoSlot);
    const propellantInventory = ship.Inventories.find((i) => i.slot === shipConfig.propellantSlot);
  
    const cargoMass = cargoInventory?.mass || 0;
    const propellantMass = propellantInventory?.mass || 0;
    const dryMass = shipConfig.hullMass + cargoMass;
    const wetMass = propellantMass + dryMass;

    console.log({cargoInventory,propellantInventory, dryMass, wetMass });
  
    const maxDeltaV = shipConfig.exhaustVelocity * Math.log(wetMass / dryMass);
    if (travelSolution.deltaV > maxDeltaV) return false;

    const lastFedAt = Time.fromUnixSeconds(crew.Crew.lastFed || 0, crew._timeAcceleration).toOrbitADays();
    if (lastFedAt + maxFoodUtilizationAdays < travelSolution?.arrivalTime) return false;
  
    return true;
  }, [crew, travelSolution, ship]);
};

export default useTravelSolutionIsValid;
