import { START_TIMESTAMP } from 'influence-utils';

// The difference in game days between the start timestamp and the lore start time
// TODO: should 1618668000 instead live in influence-utils?
const loreTimeDiff = 24 * (1618668000 - START_TIMESTAMP) / 86400;
export const orbitTimeToGameTime = (orbitTime) => {
  return orbitTime - loreTimeDiff;
};

export const unixTimeToGameTime = (unixTime) => {
  const orbitTime = (unixTime - START_TIMESTAMP) / 3600;
  return orbitTimeToGameTime(orbitTime);
};