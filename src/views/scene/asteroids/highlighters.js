import { Color } from 'three';

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
    const pct = Math.pow((v - config.min) / (config.max - config.min), 0.2);
    return color.lerp(new Color(config.to), pct).toArray();
  },

  spectralType: categoryHighlighter,
  axis: minMaxHighlighter,
  inclination: minMaxHighlighter,
  eccentricity: minMaxHighlighter,
  ownership: categoryHighlighter
};

export default highlighters;
