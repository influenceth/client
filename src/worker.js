import { KeplerianOrbit } from 'influence-utils';
import constants from '~/constants';

onmessage = async function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidsData':
      updateAsteroidsData(event.data.asteroids);
      break;
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    default:
      console.error('Method not supported');
  }
};

// Caches asteroids data in the worker to cut down on data transfer
let asteroidsData = [];

const updateAsteroidsData = function(newAsteroidsData) {
  asteroidsData = newAsteroidsData;
};

const updateAsteroidPositions = function(elapsed = 0) {
  const positions = asteroidsData.map(a => {
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
