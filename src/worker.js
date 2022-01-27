import { Matrix4, Vector3 } from 'three';

import * as utils from '~/lib/geometryUtils';
import { initChunkTextures, rebuildChunkGeometry } from '~/lib/graphics/helpers/TerrainChunkUtils';

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
    case 'rebuildAsteroidChunks':
      rebuildAsteroidChunks(event.data.chunks);
      break;
    default:
      console.error('Method not supported');
  }
};

// caches asteroids data in the worker
let asteroidsData = [];

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

const rebuildAsteroidChunks = function(chunks) {
  initChunkTextures().then(() => {
    Promise.all(
      chunks.map((chunk) => {
        // (re-init THREE class objects since were abstracted to generic objects when passed to worker)
        chunk.offset = new Vector3(chunk.offset.x, chunk.offset.y, chunk.offset.z);
        chunk.groupMatrix = (new Matrix4()).fromArray(chunk.groupMatrix.elements);
        return rebuildChunkGeometry(chunk);
      })
    )
    .then((rebuilt) => {
      console.log({ rebuilt });
      postMessage({
        topic: 'rebuiltAsteroidChunks',
        chunks: rebuilt
      });
    });
  });
};
