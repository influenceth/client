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

const rebuildTerrainChunk = function (chunk) {
  initChunkTextures().then(() => {
    chunk.offset = new Vector3(chunk.offset.x, chunk.offset.y, chunk.offset.z);
    chunk.groupMatrix = (new Matrix4()).fromArray(chunk.groupMatrix.elements);
    const rebuiltChunk = rebuildChunkGeometry(chunk);
    const x = new Uint32Array(200);
    postMessage({
      topic: 'rebuiltTerrainChunk',
      chunk: rebuiltChunk
    }, [
      x.buffer
    ]);
    // TODO: could we use transfer to pass rendered chunks back?
    // (see `transfer` on https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage)
  });
};

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
