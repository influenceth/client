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
        consumption: foodBonuses[Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME]?.crewmatesMultiplier,
        rationing: foodBonuses[Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY]?.crewmatesMultiplier
      };

      isLoading = false;
    }
    return { data, isLoading };
  }, [crew, crewmates, crewLoading, crewmatesLoading]);
};

export default useHydratedCrew;
