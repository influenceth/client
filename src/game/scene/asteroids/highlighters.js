import { Color } from 'three';
import { Address } from '@influenceth/sdk';

import constants from '~/lib/constants';

const getter = (a, config) => {
  switch (config.field) {
    case 'axis': return a.Orbit.a;
    case 'eccentricity': return a.Orbit.ecc;
    case 'inclination': return a.Orbit.inc;
    case 'ownership': {
      if (a.Nft?.owner) {
        if (config.myAddress && Address.areEqual(a.Nft.owner, config.myAddress)) {
          return 'ownedByMe';
        }
        if (config.address && Address.areEqual(a.Nft.owner, config.address)) {
          return 'ownedBy';
        }
        return 'owned';
      }
      return 'unowned';
    }
    case 'radius': return a.Celestial.radius;
    case 'spectralType': return a.Celestial.celestialType;
    case 'scanStatus': return a.Celestial.scanStatus;
    default: return null;
  }
}

const surfaceAreaHighlighter = (a, config) => {
  const toRadiusConfig = Object.assign({}, config, {
    min: Math.sqrt(config.min / (4 * Math.PI)),
    max: Math.sqrt(config.max / (4 * Math.PI))
  });

  return radiusHighlighter(a, toRadiusConfig);
};

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
  surfaceArea: surfaceAreaHighlighter,
  radius: radiusHighlighter,
  spectralType: categoryHighlighter,
  scanStatus: categoryHighlighter,
  axis: minMaxHighlighter,
  inclination: minMaxHighlighter,
  eccentricity: minMaxHighlighter,
  ownership: categoryHighlighter
};

export default highlighters;
