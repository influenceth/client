import { START_TIMESTAMP } from '@influenceth/sdk';

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