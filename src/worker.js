import { Vector3 } from 'three';

import * as utils from '~/lib/geometryUtils';
import { rebuildChunkGeometry } from '~/game/scene/asteroid/helpers/TerrainChunkUtils';
import { getPlotGeometry, getPlotRegions, getClosestPlots } from '~/game/scene/asteroid/helpers/PlotGeometry';

let cache = {
  asteroid: {},
  asteroids: {},
  planets: {},
};

onmessage = function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidPositions':
      if (event.data.asteroids) cache.asteroids = event.data.asteroids;
      updateAsteroidPositions(cache.asteroids?.orbitals, event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      if (event.data.planets) cache.planets = event.data.planets;
      updatePlanetPositions(cache.planets?.orbitals, event.data.elapsed);
      break;
    case 'rebuildTerrainGeometry':
      if (event.data.asteroid) cache.asteroid = event.data.asteroid;
      rebuildTerrainGeometry({
        ...cache.asteroid,
        ...event.data.chunk
      });
      break;
    // case 'rebuildTerrainMaps':
    //   if (event.data.asteroid) cache.asteroid = event.data.asteroid;
    //   rebuildTerrainMaps({
    //     ...cache.asteroid,
    //     ...event.data.chunk
    //   });
    //   break;
    case 'buildPlotGeometry':
      if (event.data.asteroid) cache.asteroid = event.data.asteroid;
      buildPlotGeometry({
        aboveSurface: event.data.aboveSurface,
        heightMaps: event.data.heightMaps,
        textureQuality: event.data.textureQuality,
        ...cache.asteroid,
      });
      break;
    case 'buildPlotRegions':
      buildPlotRegions(event.data.data);
      break;
    case 'findClosestPlots':
      findClosestPlots(event.data.data);
      break;
    default:
      console.error('Method not supported');
  }
};

const updateAsteroidPositions = function(orbitals, elapsed = 0) {
  const positions = utils.getUpdatedAsteroidPositions(orbitals, elapsed);
  postMessage({
    topic: 'asteroidPositions',
    positions
  }, [positions.buffer]);
};

const updatePlanetPositions = function(orbitals, elapsed = 0) {
  const positions = utils.getUpdatedPlanetPositions(orbitals, elapsed);
  postMessage({
    topic: 'planetPositions',
    positions
  }, [positions.buffer]);
};

// TODO: remove debug
// let taskTotal = 0;
// let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg execution time (internal, over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

const rebuildTerrainGeometry = function (chunk) {
  chunk.offset = new Vector3(chunk.offset[0], chunk.offset[1], chunk.offset[2]);
  chunk.stretch = new Vector3(chunk.stretch[0], chunk.stretch[1], chunk.stretch[2]);
  const { positions, normals } = rebuildChunkGeometry(chunk);
  postMessage({
    topic: 'rebuiltTerrainChunkGeometry',
    positions,
    normals
  }, [
    positions.buffer,
    normals.buffer
  ]);
}

// const rebuildTerrainMaps = function (chunk) {
//   chunk.offset = new Vector3(chunk.offset[0], chunk.offset[1], chunk.offset[2]);
//   chunk.stretch = new Vector3(chunk.stretch[0], chunk.stretch[1], chunk.stretch[2]);
//   initChunkTextures().then(() => {
//     const maps = rebuildChunkMaps(chunk);
//     const transferable = [
//       maps.colorBitmap,
//       maps.heightBitmap,
//       maps.normalBitmap,
//     ];
//     if (maps.emissiveBitmap) transferable.push(maps.emissiveBitmap);
//     postMessage({
//       topic: 'rebuiltTerrainChunkMaps',
//       maps
//     }, transferable);
//   });
// }

const buildPlotGeometry = function({ aboveSurface, config, heightMaps, textureQuality }) {
  const { positions, orientations } = getPlotGeometry({
    config,
    aboveSurface,
    prebuiltHeightMaps: heightMaps,
    textureQuality
  });
  postMessage({
    topic: 'builtPlotGeometry',
    positions,
    orientations
  }, [
    positions.buffer,
    orientations.buffer
  ]);
}

const buildPlotRegions = function ({ positions, regionTally }) {
  const regions = getPlotRegions(positions, regionTally);
  postMessage({
    topic: 'gotPlotRegions',
    regions
  }, [
    regions.buffer
  ])
};

const findClosestPlots = function(data) {
  const plots = getClosestPlots(data);
  postMessage({ topic: 'foundClosestPlots', plots });
}
