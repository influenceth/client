import { useMemo } from '~/lib/react-debug';
import { Crewmate } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '~/hooks/useEntity';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';

const useActionCrew = (currentAction) => {
  const { _cachedData, startTime } = currentAction || {};
  const { crew: liveCrew } = useCrewContext();

  // NOTE: if station location was allowed to change mid-action, this can be problematic, so
  // all new activities have crew.Location included... old ones will need to use this as a
  // best-effort fallback (so we'll only load if crew.Location is not set)
  const { data: liveStation } = useEntity(_cachedData?.crew?.Location ? null : _cachedData?.station?.entity);

  return useMemo(import.meta.url, () => {
    if (_cachedData) {
      // rebuild pseudo-crew from cached data
      const c = {
        ..._cachedData.crew,  // includes id, label, uuid, Crew, Location (if v2)
        _crewmates: _cachedData.crewmates || [],  // each includes id, label, uuid, Crewmate
        _station: { ..._cachedData?.station },

        // pass in _now to be able to calculate food bonus at the time of action start
        // (_timeAcceleration is not actually part of crew anyway, so assume it is static)
        _now: startTime,
        _timeAcceleration: liveCrew?._timeAcceleration,

        // (they must have been ready when action started)
        _actionTypeTriggered: false,
        _ready: true,
      };

      // see note above -- if Location not set, fall back to station's current location (best effort)
      if (!c.Location) c.Location = liveStation?.Location;

      // attach _location
      c._location = locationsArrToObj(c.Location?.locations || []);

      // load bonuses
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

      // console.log('usecachedcrew', c);

      return c;
    }
    return liveCrew;
  }, [_cachedData, liveCrew, liveStation, startTime]);
};

export default useActionCrew;