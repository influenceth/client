import { KeplerianOrbit } from 'influence-utils';
import { BufferGeometry, Vector3, WebGLRenderer } from 'three';

import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import { fiboOnHeightMap } from '~/lib/graphics/fiboUtils';
import HeightMap from '~/game/scene/asteroid/HeightMap';
import ColorMap from '~/game/scene/asteroid/ColorMap';
import LotMap from '~/game/scene/asteroid/FiboMap';
import NormalMap from '~/game/scene/asteroid/NormalMap';
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
    case 'renderGeometry':
      renderGeometry(event.data.heightMap, event.data.config);
      //renderLotGeometry(event.data.heightMap, event.data.config);
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
  const renderer = new WebGLRenderer({ canvas: offscreen, antialias: true });
  textureRenderer = new TextureRenderer(renderer);
}

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

const renderMaps = async function(mapSize, config) {
  if (textureRenderer === undefined) throw new Error('Renderer must be set first with offscreen canvas');
  const heightMap = new HeightMap(mapSize, config, textureRenderer);
  const colorMapObj = new ColorMap(mapSize, heightMap, config, textureRenderer);
  const colorMap = await colorMapObj.generateColorMap();
  const normalMap = new NormalMap(mapSize, heightMap, config, textureRenderer);
  const lotMapObj = new LotMap(mapSize, config, textureRenderer);
  const lotMap = await lotMapObj.generateFiboMap();
  postMessage({ topic: 'maps', heightMap, colorMap, normalMap, lotMap });
};

const renderGeometry = function(heightMap, config) {
  const geometry = new CubeSphere(1, 50);
  geometry.displaceWithHeightMap(heightMap, config.radius, config);
  delete geometry.parameters;
  const geometryJSON = geometry.toJSON();
  postMessage({ topic: 'geometry', geometryJSON });
};

const renderLotGeometry = async function(heightMap, config) {
  const samples = Math.floor(4 * Math.PI * config.radius * config.radius / 1e6);
  const bufferGeometry = new BufferGeometry();
  bufferGeometry.setFromPoints(fiboOnHeightMap(samples, heightMap, config));
  const lotGeometryJSON = bufferGeometry.toJSON();
  postMessage({ topic: 'lotGeometry', lotGeometryJSON });
};

