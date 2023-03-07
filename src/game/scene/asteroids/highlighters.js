import { Color } from 'three';

import constants from '~/lib/constants';

const getter = (a, config) => {
  switch (config.field) {
    case 'axis': return a.orbital.a;
    case 'eccentricity': return a.orbital.e;
    case 'inclination': return a.orbital.i;
    case 'ownership': {
      if (a.owner) {
        if (config.myAddress && a.owner === config.myAddress) {
          return 'ownedByMe';
        }
        if (config.address && a.owner === config.address) {
          return 'ownedBy';
        }
        return 'owned';
      }
      return 'unowned';
    }
    case 'radius': return a.r;
    case 'spectralType': return a.spectralType;
    default: return null;
  }
}

const radiusHighlighter = (a, config) => {
  const v = getter(a, config);
  const color = new Color(config.from);
  const min = Math.pow(config.min / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
  const max = Math.pow(config.max / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
  const value = Math.pow(v / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
  const pct = (value - min) / (max - min);
  return color.lerp(new Color(config.to), pct).toArray();
};

const minMaxHighlighter = (a, config) => {
  const v = getter(a, config);
  const color = new Color(config.from);
  const pct = (v - config.min) / (config.max - config.min);
  return color.lerp(new Color(config.to), pct).toArray();
};

const categoryHighlighter = (a, config) => {
  const v = getter(a, config);
  const color = new Color(config.colorMap[v]);
  return color.toArray();
}

const highlighters = {
  radius: radiusHighlighter,
  spectralType: categoryHighlighter,
  axis: minMaxHighlighter,
  inclination: minMaxHighlighter,
  eccentricity: minMaxHighlighter,
  ownership: categoryHighlighter
};

export default highlighters;
