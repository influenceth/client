import { Vector3 } from 'three';

import * as utils from '~/lib/geometryUtils';
import { rebuildChunkGeometry } from '~/lib/graphics/helpers/TerrainChunkUtils';

onmessage = function(event) {
  switch (event.data.topic) {
    case 'updateAsteroidPositions':
      updateAsteroidPositions(event.data.asteroids, event.data.elapsed);
      break;
    case 'updatePlanetPositions':
      updatePlanetPositions(event.data.planets, event.data.elapsed);
      break;
    case 'rebuildTerrainGeometry':
      rebuildTerrainGeometry(event.data.chunk);
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

const rebuildTerrainGeometry = function (chunk, debug) {
  chunk.offset = new Vector3(chunk.offset[0], chunk.offset[1], chunk.offset[2]);
  // TODO: remove debug
  const startTime = Date.now();
  const positions = rebuildChunkGeometry(chunk);
  if (debug) { // TODO: remove debug
    taskTotal += Date.now() - startTime;
    taskTally++;
  }

  // TODO: check structure of positions
  postMessage({
    topic: 'rebuiltTerrainChunk',
    positions
  }, [
    positions.buffer,
  ]);
}