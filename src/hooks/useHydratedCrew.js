import { useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { Crewmate } from '@influenceth/sdk';

import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import useBlockTime from '~/hooks/useBlockTime';
import useConstants from '~/hooks/useConstants';
import useCrew from '~/hooks/useCrew';
import useCrewmates from '~/hooks/useCrewmates';

const useHydratedCrew = (id) => {
  const { data: crew, isLoading: crewLoading } = useCrew(id);
  const { data: crewmates, isLoading: crewmatesLoading, dataUpdatedAt } = useCrewmates(crew?.Crew?.roster);
  const { data: CREW_SCHEDULE_BUFFER, isLoading: constantsLoading } = useConstants('CREW_SCHEDULE_BUFFER');
  const blockTime = useBlockTime();

  return useMemo(() => {
    let data = null;
    let isLoading = true;
    if (crew && !crewLoading && !crewmatesLoading && !constantsLoading) {
      data = cloneDeep(crew);
      data._crewmates = (crewmates || []).map((c) => cloneDeep(c));
      data._location = locationsArrToObj(crew.Location?.locations);
      data._ready = blockTime >= data.Crew?.readyAt;
      data._readyToSequence = blockTime + CREW_SCHEDULE_BUFFER >= data.Crew.readyAt;

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
  }, [blockTime, crew, crewmates, crewLoading, crewmatesLoading, dataUpdatedAt, CREW_SCHEDULE_BUFFER]);
};

export default useHydratedCrew;
