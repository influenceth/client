import { KeplerianOrbit } from 'influence-utils';

import CubeSphere from '~/lib/graphics/CubeSphere';
import HeightMap from '~/game/scene/asteroid/HeightMap';
import ColorMap from '~/game/scene/asteroid/ColorMap';
import NormalMap from '~/game/scene/asteroid/NormalMap';
import constants from '~/lib/constants';

export const getUpdatedAsteroidPositions = function(asteroidsData, elapsed = 0) {
  const positions = asteroidsData.map(a => {
    const coords = (new KeplerianOrbit(a.orbital)).getPositionAtTime(elapsed);
    return Object.keys(coords).map((key, i) => coords[key] *= constants.AU);
  });

  return [].concat.apply([], positions);
};

export const getUpdatedPlanetPositions = function(planets, elapsed = 0) {
  const positions = planets.map(p => {
    const coords = (new KeplerianOrbit(p.orbital)).getPositionAtTime(elapsed);
    return Object.keys(coords).map((key, i) => coords[key] *= constants.AU);
  });

  return [].concat.apply([], positions);
};

export const renderAsteroidMaps = async function(mapSize, config, textureRenderer) {
  if (textureRenderer === undefined) throw new Error('Renderer must be set first with offscreen canvas');
  const heightMap = new HeightMap(mapSize, config, textureRenderer);
  const colorMapObj = new ColorMap(mapSize, heightMap, config, textureRenderer);
  const colorMap = await colorMapObj.generateColorMap();
  const normalMap = new NormalMap(mapSize, heightMap, config, textureRenderer);

  return { heightMap, colorMap, normalMap };
};

export const renderAsteroidGeometry = function(heightMap, config) {
  const geometry = new CubeSphere(1, 50);
  geometry.displaceWithHeightMap(heightMap, config.radius, config);
  delete geometry.parameters;

  return geometry.toJSON();
};
