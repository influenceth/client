import { KeplerianOrbit } from 'influence-utils';

import constants from '~/lib/constants';

export const getUpdatedAsteroidPositions = function(orbitals, elapsed = 0) {
  const positions = new Float32Array(orbitals.length * 3);
  orbitals.forEach((orbital, i) => {
    const coords = (new KeplerianOrbit(orbital)).getPositionAtTime(elapsed);
    positions[i * 3 + 0] = coords.x * constants.AU;
    positions[i * 3 + 1] = coords.y * constants.AU;
    positions[i * 3 + 2] = coords.z * constants.AU;
  });
  return positions;
};

export const getUpdatedPlanetPositions = function(orbitals, elapsed = 0) {
  const positions = new Float32Array(orbitals.length * 3);
  orbitals.forEach((orbital, i) => {
    const coords = (new KeplerianOrbit(orbital)).getPositionAtTime(elapsed);
    positions[i * 3 + 0] = coords.x * constants.AU;
    positions[i * 3 + 1] = coords.y * constants.AU;
    positions[i * 3 + 2] = coords.z * constants.AU;
  });
  return positions;
};

