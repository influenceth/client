import { Crew, Crewmate, Entity, Lot } from '@influenceth/sdk';

const timerIncrements = { d: 86400, h: 3600, m: 60, s: 1 };
export const formatTimer = (secondsRemaining, maxPrecision = null) => {
  let remainder = secondsRemaining;
  const parts = Object.keys(timerIncrements).reduce((acc, k) => {
    if (acc.length > 0 || remainder >= timerIncrements[k] || timerIncrements[k] === 1) {
      const unit = Math.floor(remainder / timerIncrements[k]);
      remainder = remainder % timerIncrements[k];
      acc.push(`${unit}${k}`);
    }
    return acc;
  }, []);
  if (maxPrecision) return parts.slice(0, maxPrecision).join(' ');
  return parts.join(' ');
};

export const formatFixed = (value, maximumFractionDigits = 0) => {
  const div = 10 ** maximumFractionDigits;
  return (Math.round((value || 0) * div) / div).toLocaleString();
};

export const formatPrecision = (value, maximumPrecision = 0) => {
  const allowedDecimals = Math.max(0, maximumPrecision - Math.ceil(Math.log10(Math.abs(value))));
  if (isNaN(allowedDecimals)) { console.log('is nan', value, maximumPrecision); }
  return formatFixed(value, allowedDecimals);
};

export const formatPrice = (sway, { minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (sway >= 1e6) {
    scale = 1e6;
    unitLabel = 'M';
  } else if (sway >= 1e3) {
    scale = 1e3;
    unitLabel = 'k';
  } else {
    scale = 1;
    unitLabel = '';
  }

  const workingUnits = (sway / scale);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)}${unitLabel}`;
};

export const keyify = (str) => (str || '').replace(/[^a-zA-Z0-9_]/g, '');

export const reactBool = (value) => value ? 'true' : undefined;
export const nativeBool = (value) => Boolean(value);

export const locationsArrToObj = (locations) => {
  const lotLocation = locations.find((l) => l.label === Entity.IDS.LOT);
  return {
    asteroidId: locations.find((l) => Number(l.label) === Entity.IDS.ASTEROID)?.id,
    lotId: lotLocation?.id,
    lotIndex: lotLocation?.id ? Lot.toIndex(lotLocation?.id) : null,
    buildingId: locations.find((l) => l.label === Entity.IDS.BUILDING)?.id,
    shipId: locations.find((l) => l.label === Entity.IDS.SHIP)?.id,
  }
};

export const andList = (items) => {
  if (items.length <= 1) return <>{items}</>;
  if (items.length === 2) return <>{items[0]} and {items[1]}</>;
  return <>{items.slice(0, -1).join(', ')}, and {items[items.length - 1]}</>;
}

export const ucfirst = (str) => {
  if (!str) return str;
  const s = (str || '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1)
};

const timeAbilityIds = [
  Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME,
  Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
  Crewmate.ABILITY_IDS.EXTRACTION_TIME,
  Crewmate.ABILITY_IDS.CONSTRUCTION_TIME,
  Crewmate.ABILITY_IDS.REFINING_TIME,
  
  Crewmate.ABILITY_IDS.MANUFACTURING_TIME,
  Crewmate.ABILITY_IDS.REACTION_TIME,
  Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME,

  // TODO: these?
  // Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY,
  // Crewmate.ABILITY_IDS.PROPELLANT_FLOW_RATE,
];

export const getCrewAbilityBonuses = (abilityIdOrAbilityIds, crew) => {
  const isMultiple = Array.isArray(abilityIdOrAbilityIds);
  const timeSinceFed = Math.max(0, ((Date.now() / 1000) - crew.Crew.lastFed) * (crew._timeAcceleration || 24));
  const bonuses = (isMultiple ? abilityIdOrAbilityIds : [abilityIdOrAbilityIds]).reduce((acc, abilityId) => {
    acc[abilityId] = Crew.getAbilityBonus(abilityId, crew._crewmates, crew._station, timeSinceFed);
    
    // should this only be applied in dev?
    if (crew._timeAcceleration !== 24 && timeAbilityIds.includes(abilityId)) {
      const timeMultiplier = crew._timeAcceleration / 24;
      acc[abilityId].totalBonus *= timeMultiplier;
      acc[abilityId].timeMultiplier = timeMultiplier;
    }

    return acc;
  }, {});
  return isMultiple ? bonuses : bonuses[abilityIdOrAbilityIds];
}
