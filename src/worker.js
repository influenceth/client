import { Vector3 } from 'three';

import constants from '~/lib/constants';
import * as utils from '~/lib/geometryUtils';
import { rebuildChunkGeometry, rebuildChunkMaps, initChunkTextures } from '~/game/scene/asteroid/helpers/TerrainChunkUtils';

const {
  DISABLE_BACKGROUND_TERRAIN_MAPS
} = constants;

let cache = {
  asteroid: {}
};

onmessage = function(event) {
  switch (event.data.topic) {
    case 'initGpuAssets':
      initGpuAssets(event.data.data);
      break;
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.asteroids, event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    case 'rebuildTerrainGeometry':
      if (event.data.asteroid) cache.asteroid = event.data.asteroid;
      rebuildTerrainGeometry({
        ...cache.asteroid,
        ...event.data.chunk
      });
      break;
    default:
      console.error('Method not supported');
  }
};

const initGpuAssets = function(data) {
  initChunkTextures(data.ramps);
  postMessage({ topic: 'initedGpuAssets' });
};

const updateAsteroidPositions = function(asteroids, elapsed = 0) {
  postMessage({
    topic: 'asteroidPositions',
    positions: utils.getUpdatedAsteroidPositions(asteroids, elapsed)
  });
};

const updatePlanetPositions = function(planets, elapsed = 0) {
  postMessage({
    topic: 'planetPositions',
    positions: utils.getUpdatedPlanetPositions(planets, elapsed)
  });
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
      postMessage({
        topic: 'rebuiltTerrainChunk',
        positions,
        normals,
        maps
      }, [
        positions.buffer,
        normals.buffer,
        maps.colorBitmap,
        maps.heightBitmap,
        maps.normalBitmap,
      ]);
    });
  }
}
