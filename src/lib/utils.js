import { Entity } from '@influenceth/sdk';

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

export const boolAttr = (value) => value ? 'true' : undefined;

export const locationsArrToObj = (locations) => {
  const lotLocation = locations.find((l) => l.label === Entity.IDS.LOT);
  return {
    asteroidId: locations.find((l) => Number(l.label) === Entity.IDS.ASTEROID)?.id,
    lotId: lotLocation ? Entity.toPosition(lotLocation)?.lotId : null,
    buildingId: locations.find((l) => l.label === Entity.IDS.BUILDING)?.id,
    shipId: locations.find((l) => l.label === Entity.IDS.SHIP)?.id,
  }
};
