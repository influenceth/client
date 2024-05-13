import { useMemo } from 'react';
import { Crewmate, Ship, Time } from '@influenceth/sdk';

import useCrewContext from './useCrewContext';
import useShip from './useShip';
import useStore from './useStore';
import { getCrewAbilityBonuses } from '~/lib/utils';

export const maxFoodUtilizationAdays = 1.5 * 365; // 1.5 years

const useTravelSolutionIsValid = () => {
  const { crew } = useCrewContext();
  const shipId = crew?.Ship?.emergencyAt > 0 ? crew : crew?._location?.shipId;
  const { data: ship } = useShip(shipId);

  const travelSolution = useStore(s => s.asteroids.travelSolution);
  const exhaustBonus = useMemo(() => {
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.PROPELLANT_EXHAUST_VELOCITY, crew);
  }, [crew]);

  return useMemo(() => {
    if (!travelSolution) return false;
    if (travelSolution._isSimulation) return !travelSolution._isSimulationInvalid;

    if (!crew || !ship) return false;

    const shipConfig = Ship.TYPES[ship.Ship?.shipType];

    const propellantInventory = ship.Inventories.find((i) => i.slot === shipConfig.propellantSlot);
    const propellantMass = propellantInventory?.mass || 0;

    const maxDeltaV = Ship.Entity.propellantToDeltaV(ship, propellantMass, exhaustBonus?.totalBonus);
    if (travelSolution.deltaV > maxDeltaV) return false;

    if (ship.Ship?.emergencyAt > 0) {
      if (travelSolution.departureTime + maxFoodUtilizationAdays < travelSolution?.arrivalTime) return false;
    } else {
      const lastFedAt = Time.fromUnixSeconds(crew.Crew.lastFed || 0, crew._timeAcceleration).toOrbitADays();
      if (lastFedAt + maxFoodUtilizationAdays < travelSolution?.arrivalTime) return false;
    }

    return true;
  }, [crew, travelSolution, ship]);
};

export default useTravelSolutionIsValid;
