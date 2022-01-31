import { WebGLRenderer } from 'three';

import * as utils from '~/lib/geometryUtils';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

onmessage = async function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidsData':
      updateAsteroidsData(event.data.asteroids);
      updateAsteroidPositions(event.data.elapsed);
      break;
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    case 'renderGeometry':
      renderGeometry(event.data.heightMap, event.data.config);
      break;
    case 'renderMaps':
      renderMaps(event.data.mapSize, event.data.config);
      break;
    default:
      console.error('Method not supported');
  }
};

// Caches asteroids data, canvas and textureRenderer in the worker
let asteroidsData = [];
let textureRenderer;

// Setup offscreen canvas
if (typeof OffscreenCanvas !== 'undefined') {
  const offscreen = new OffscreenCanvas(0, 0);
  offscreen.style = { width: 0, height: 0 };
  const renderer = new WebGLRenderer({ canvas: offscreen, antialias: true });
  textureRenderer = new TextureRenderer(renderer);
}

const updateAsteroidsData = function(newAsteroidsData) {
  asteroidsData = newAsteroidsData;
};

const updateAsteroidPositions = function(elapsed = 0) {
  postMessage({
    topic: 'asteroidPositions',
    positions: utils.getUpdatedAsteroidPositions(asteroidsData, elapsed)
  });
};

const updatePlanetPositions = function(planets, elapsed = 0) {
  postMessage({
    topic: 'planetPositions',
    positions: utils.getUpdatedPlanetPositions(planets, elapsed)
  });
};

const renderMaps = async function(mapSize, config) {
  postMessage({
    topic: 'maps',
    ...(await utils.renderAsteroidMaps(mapSize, config, textureRenderer))
  });
};

const renderGeometry = function(heightMap, config) {
  postMessage({
    topic: 'geometry',
    geometryJSON: utils.renderAsteroidGeometry(heightMap, config)
  });
};
