import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Crewmate } from '@influenceth/sdk';

import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import useCrew from './useCrew';
import useCrewmates from './useCrewmates';

const useHydratedCrew = (id) => {
  const { data: crew, isLoading: crewLoading } = useCrew(id);
  const { data: crewmates, isLoading: crewmatesLoading } = useCrewmates(crew?.Crew?.roster);

  return useMemo(() => {
    let data = null;
    let isLoading = true;
    if (crew && !crewLoading && !crewmatesLoading) {
      data = cloneDeep(crew);
      data._crewmates = (crewmates || []).map((c) => cloneDeep(c));
      data._location = locationsArrToObj(crew.Location?.locations);

      const foodBonuses = getCrewAbilityBonuses([Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME, Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY], data);
      data._foodBonuses = {
        consumption: foodBonuses[Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME]?.totalBonus,
        rationing: foodBonuses[Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY]?.totalBonus
      };

      // TODO: do we need this? foodBonuses are needed for "food %" display, not sure what this would be for
      // const invBonuses = getCrewAbilityBonuses([Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY, Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY], data);
      // data._inventoryBonuses = {
      //   mass: invBonuses[Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY]?.totalBonus,
      //   volume: invBonuses[Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY]?.totalBonus,
      // };

      isLoading = false;
    }
    return { data, isLoading };
  }, [crew, crewmates, crewLoading, crewmatesLoading]);
};

export default useHydratedCrew;
