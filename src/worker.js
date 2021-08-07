import { KeplerianOrbit } from 'influence-utils';
import { WebGLRenderer } from 'three';

import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import HeightMap from '~/views/scene/asteroid/HeightMap';
import ColorMap from '~/views/scene/asteroid/ColorMap';
import NormalMap from '~/views/scene/asteroid/NormalMap';
import constants from '~/lib/constants';

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
    case 'canvas':
      canvas = event.data.canvas;
      canvas.style = { width: 0, height: 0 };
      const renderer = new WebGLRenderer({ canvas: canvas, antialias: true });
      textureRenderer = new TextureRenderer(renderer);
      break;
    case 'renderGeometry':
      renderGeometry(event.data.heightMap, event.data.radius, event.data.asteroidConfig);
      break;
    case 'renderMaps':
      renderMaps(event.data.mapSize, event.data.asteroidConfig);
      break;
    default:
      console.error('Method not supported');
  }
};

// Caches asteroids data, canvas and textureRenderer in the worker
let asteroidsData = [];
let canvas;
let textureRenderer;

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

const renderMaps = async function(mapSize, asteroidConfig) {
  if (textureRenderer === undefined) throw new Error('Renderer must be set first with offscreen canvas');
  const heightMap = new HeightMap(mapSize, asteroidConfig, textureRenderer);
  const colorMapObj = new ColorMap(mapSize, heightMap, asteroidConfig, textureRenderer);
  const colorMap = await colorMapObj.generateColorMap();
  const normalMap = new NormalMap(mapSize, heightMap, asteroidConfig, textureRenderer);
  postMessage({ topic: 'maps', heightMap, colorMap, normalMap });
};

const renderGeometry = function(heightMap, radius, asteroidConfig) {
  const geometry = new CubeSphere(1, 50);
  geometry.displaceWithHeightMap(heightMap, radius, asteroidConfig);
  delete geometry.parameters;
  const geometryJSON = geometry.toJSON();
  postMessage({ topic: 'geometry', geometryJSON });
};
