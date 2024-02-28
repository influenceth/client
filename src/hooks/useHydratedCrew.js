import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Crewmate } from '@influenceth/sdk';

import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import useCrew from './useCrew';
import useCrewmates from './useCrewmates';
import useBlockTime from './useBlockTime';

const useHydratedCrew = (id) => {
  const { data: crew, isLoading: crewLoading } = useCrew(id);
  const { data: crewmates, isLoading: crewmatesLoading } = useCrewmates(crew?.Crew?.roster);
  const blockTime = useBlockTime();

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

      data._ready = (crew.Crew?.readyAt) ? blockTime >= crew.Crew.readyAt : true;
    }
    return { data, isLoading };
  }, [blockTime, crew, crewmates, crewLoading, crewmatesLoading]);
};

export default useHydratedCrew;
