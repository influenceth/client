import { KeplerianOrbit } from 'influence-utils';
import constants from '~/constants';

onmessage = async function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.asteroids, event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    default:
      console.error('Method not supported');
  }
};

const updateAsteroidPositions = function(asteroids, elapsed = 0) {
  const positions = asteroids.map(a => {
    const coords = (new KeplerianOrbit(a.orbital)).getPositionAtTime(elapsed);
    return Object.keys(coords).map((key, i) => coords[key] *= constants.AU);
  });

  const flatData = [].concat.apply([], positions);
  postMessage({ topic: 'asteroidPositions', positions: flatData });
};

const updatePlanetPositions = function(planets, elapsed = 0) {
  const positions = planets.map(p => {
    const coords = (new KeplerianOrbit(p.orbital)).getPositionAtTime(elapsed);
    return Object.keys(coords).map((key, i) => coords[key] *= constants.AU);
  });

  const flatData = [].concat.apply([], positions);
  postMessage({ topic: 'planetPositions', positions: flatData });
};
