import { useMemo } from 'react';
import { Crewmate } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '~/hooks/useEntity';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';

const useActionCrew = ({ _cachedData, startTime } = {}) => {
  const { crew: liveCrew } = useCrewContext();
  
  // NOTE: if station location was allowed to change mid-action, this could be problematic
  const { data: liveStation } = useEntity(_cachedData?.station?.entity);

  return useMemo(() => {
    if (_cachedData) {
      const { entity: crewEntity, ...Crew } = _cachedData.crew || {};
      const c = {
        ...crewEntity,
        Crew,
        
        Location: liveStation?.Location,
        _location: locationsArrToObj(liveStation?.Location?.locations || []),

        _crewmates: (_cachedData.crewmates || [])
          .map(({ entity: crewmateEntity, ...Crewmate }) => ({ ...crewmateEntity, Crewmate })),
        
        _actionTypeTriggered: false, // they must have been ready when action started
        _ready: true, // they must have been ready when action started
        _station: { ..._cachedData?.station },
        _timeAcceleration: liveCrew?._timeAcceleration,

        // pass in _now to be able to calculate food bonus at the time of action start
        _now: startTime
      };

      const bonuses = getCrewAbilityBonuses([
        Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME,
        Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY,
        Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY,
        Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY
      ], c);

      c._foodBonuses = {
        consumption: bonuses[Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME]?.totalBonus,
        rationing: bonuses[Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY]?.totalBonus
      };
      c._inventoryBonuses = {
        mass: bonuses[Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY]?.totalBonus,
        volume: bonuses[Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY]?.totalBonus,
      };

      console.log('usecachedcrew', c);

      return c;
    }
    return liveCrew;
  }, [_cachedData, liveCrew, liveStation, startTime]);
};

export default useActionCrew;