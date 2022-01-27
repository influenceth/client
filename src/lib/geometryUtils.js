import { KeplerianOrbit } from 'influence-utils';

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

