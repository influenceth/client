import { Color } from 'three';

import constants from '~/constants';

const minMaxHighlighter = (v, config) => {
  const color = new Color(config.from);
  const pct = (v - config.min) / (config.max - config.min);
  return color.lerp(new Color(config.to), pct).toArray();
};

const categoryHighlighter = (v, config) => {
  const color = new Color(config.colorMap[v]);
  return color.toArray();
}

const highlighters = {

  radius: (v, config) => {
    const color = new Color(config.from);
    const min = Math.pow(config.min / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
    const max = Math.pow(config.max / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
    const value = Math.pow(v / constants.MAX_ASTEROID_RADIUS, -1 / 0.475);
    const pct = (value - min) / (max - min);
    return color.lerp(new Color(config.to), pct).toArray();
  },

  spectralType: categoryHighlighter,
  axis: minMaxHighlighter,
  inclination: minMaxHighlighter,
  eccentricity: minMaxHighlighter,
  ownership: categoryHighlighter
};

export default highlighters;
