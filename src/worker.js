import { Vector3 } from 'three';

import constants from '~/lib/constants';
import * as utils from '~/lib/geometryUtils';
import { rebuildChunkGeometry, rebuildChunkMaps, initChunkTextures } from '~/game/scene/asteroid/helpers/TerrainChunkUtils';

const {
  DISABLE_BACKGROUND_TERRAIN_MAPS
} = constants;

let cache = {
  asteroid: {},
  asteroids: {},
  planets: {},
};

onmessage = function(event) {
  switch (event.data.topic) {
    case 'initGpuAssets':
      initGpuAssets(event.data.data);
      break;
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
      rebuildTerrainGeometry(
        {
          ...cache.asteroid,
          ...event.data.chunk
        }
      );
      break;
    // used if want to just update cache values (but do no work)
    case 'updateParamCache': {
      Object.keys(event.data).forEach((k) => {
        if (cache.hasOwnProperty(k)) cache[k] = event.data[k];
      });
      postMessage({ topic: 'updatedParamCache'});
      break;
    }
    default:
      console.error('Method not supported');
  }
};

const initGpuAssets = function(data) {
  initChunkTextures(data.ramps);
  postMessage({ topic: 'initedGpuAssets' });
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
  if (DISABLE_BACKGROUND_TERRAIN_MAPS) {
    postMessage({
      topic: 'rebuiltTerrainChunk',
      positions,
      normals
    }, [
      positions.buffer,
      normals.buffer
    ]);
  } else {
    initChunkTextures().then(() => {
      const maps = rebuildChunkMaps(chunk);
      const transferable = [
        positions.buffer,
        normals.buffer,
        maps.colorBitmap,
        maps.heightBitmap,
        maps.normalBitmap,
      ];
      if (maps.emissiveBitmap) transferable.push(maps.emissiveBitmap);
      postMessage({
        topic: 'rebuiltTerrainChunk',
        positions,
        normals,
        maps
      }, transferable);
    });
  }
}
