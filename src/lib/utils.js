import { Capable, Crew, START_TIMESTAMP } from '@influenceth/sdk';

// The difference in game days between the start timestamp and the lore start time
// TODO: should 1618668000 instead live in influence-utils?
export const LORE_TIME_DIFF = 24 * (1618668000 - START_TIMESTAMP) / 86400;

export const orbitTimeToGameTime = (orbitTime) => {
  return orbitTime - LORE_TIME_DIFF;
};

export const orbitTimeToRealDate = (orbitTime) => {
  return new Date((orbitTime * 86400 / 24 + START_TIMESTAMP) * 1000);
};

export const unixTimeToGameTime = (unixTime) => {
  const orbitTime = (unixTime - START_TIMESTAMP) / 3600;
  return orbitTimeToGameTime(orbitTime);
};

export const getCrewAbilityBonus = (abilityId, crewmates) => {
  return Crew.getAbilityBonus(abilityId, crewmates.map((crewmate) => ({
    classId: crewmate.crewClass,
    titleId: crewmate.title,
    traitIds: crewmate.traits
  })));
}

export const capableTypeNameToId = (name) => {
  return Object.keys(Capable.TYPES).find((i) => Capable.TYPES[i].name === name);
}

const timerIncrements = {
  d: 86400,
  h: 3600,
  m: 60,
  s: 1
};

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

export const keyify = (str) => (str || '').replace(/[^a-zA-Z0-9_]/g, '');