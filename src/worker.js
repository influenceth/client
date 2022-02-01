import { Matrix4, Vector3 } from 'three';

import * as utils from '~/lib/geometryUtils';
import { initChunkTextures, rebuildChunkGeometry } from '~/lib/graphics/helpers/TerrainChunkUtils';

onmessage = function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.asteroids, event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    case 'rebuildTerrainChunk':
      rebuildTerrainChunk(event.data.chunk);
      break;
    default:
      console.error('Method not supported');
  }
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
let taskTotal = 0;
let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg execution time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

const rebuildTerrainChunk = function (chunk, debug) {
  initChunkTextures().then(() => {
    chunk.config.seed = new Vector3(chunk.config.seed.x, chunk.config.seed.y, chunk.config.seed.z);
    chunk.config.stretch = new Vector3(chunk.config.stretch.x, chunk.config.stretch.y, chunk.config.stretch.z);
    chunk.offset = new Vector3(chunk.offset.x, chunk.offset.y, chunk.offset.z);
    chunk.groupMatrix = (new Matrix4()).fromArray(chunk.groupMatrix.elements);
    // TODO: remove debug
    const startTime = Date.now();
    const rebuiltChunk = rebuildChunkGeometry(chunk);
    if (debug) { // TODO: remove debug
      taskTotal += Date.now() - startTime;
      taskTally++;
    }
    postMessage({
      topic: 'rebuiltTerrainChunk',
      chunk: rebuiltChunk
    }, [
      rebuiltChunk.positions.buffer,
      rebuiltChunk.uvs.buffer,
      rebuiltChunk.indices.buffer,
      rebuiltChunk.colorBitmap,
      rebuiltChunk.normalBitmap,
    ]);
  });
};

// try to preload textures
initChunkTextures();

// TODO: remove
// const rebuildAsteroidChunks = function(chunks) {
//   initChunkTextures().then(() => {
//     Promise.all(
//       chunks.map((chunk) => {
//         // (re-init THREE class objects since were abstracted to generic objects when passed to worker)
//         chunk.offset = new Vector3(chunk.offset.x, chunk.offset.y, chunk.offset.z);
//         chunk.groupMatrix = (new Matrix4()).fromArray(chunk.groupMatrix.elements);
//         return rebuildChunkGeometry(chunk);
//       })
//     )
//     .then((rebuilt) => {
//       console.log({ rebuilt });
//       postMessage({
//         topic: 'rebuiltAsteroidChunks',
//         chunks: rebuilt
//       });
//     });
//   });
// };
