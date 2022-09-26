import {
  Group,
  Vector3
} from 'three';
import QuadtreeTerrainPlane from './QuadtreeTerrainPlane';
import TerrainChunkManager from './TerrainChunkManager';
import {
  cubeTransforms,
  generateHeightMap,
  getMinChunkSize,
  getSamplingResolution
} from './TerrainChunkUtils';

// TODO: remove
// let taskTotal = 0;
// let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg children time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

class QuadtreeTerrainCube {
  constructor(i, config, textureSize, workerPool, materialOverrides = {}) {
    this.radius = config.radius;
    this.cameraPosition = null;
    this.smallestActiveChunkSize = 2 * this.radius;

    // adjust min chunk size for this asteroid (this is mostly to provide higher resolution for
    // smallest asteroids because user can zoom in proportionally farther)
    // if >30km, x1; if >3k, x0.5; else, x0.33
    this.minChunkSize = getMinChunkSize(this.radius);
    const prerenderResolution = getSamplingResolution(this.radius, this.minChunkSize);

    this.builder = new TerrainChunkManager(
      i,
      config,
      textureSize || prerenderResolution,
      workerPool,
      materialOverrides
    );
    this.groups = [...new Array(6)].map(_ => new Group());
    this.chunks = {};

    // build the sides of the cube (each a quadtreeplane)
    this.sides = [];
    for (let i in cubeTransforms) {
      this.sides.push({
        index: i,
        transform: cubeTransforms[i].clone(),
        quadtree: new QuadtreeTerrainPlane({
          side: i,
          size: this.radius,
          minChunkSize: this.minChunkSize,
          heightSamples: this.prerenderCoarseGeometry(
            cubeTransforms[i].clone(),
            prerenderResolution,
            config
          ),
          sampleResolution: prerenderResolution,
          localToWorld: cubeTransforms[i].clone(),
          worldStretch: config.stretch
        }),
      });

      // TODO: remove debug
      // if (this.sides.length === 5) break;
    }
  }

  dispose() {
    Object.values(this.chunks).forEach(({ chunk }) => chunk.dispose());
    this.builder.dispose();
  }

  // preprocess geometry from high-res texture
  prerenderCoarseGeometry(sideTransform, resolution, config) {
    // const s = Date.now();
    const heightMap = generateHeightMap(
      sideTransform,
      1,
      new Vector3(0, 0, 0),
      resolution,
      { N: 1, S: 1, E: 1, W: 1 },
      0,
      16,
      false,
      config,
      'texture'
    );
    // console.log('time for coarse', Date.now() - s);

    const heightSamples = [];
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const bi = (resolution * (resolution - y - 1) + x) * 4; // (flip y)
        const disp = -1 + (heightMap.buffer[bi] + heightMap.buffer[bi + 1] / 255) / 127.5; // (seems like this should be 128)
        heightSamples.push(config.radius * (1 + disp * config.dispWeight));
      }
    }
    return heightSamples;
  }

  setCSM(csmManager) {
    this.csm = csmManager;
    this.builder.csmManager = this.csm;
  }

  setShadowsEnabled(state) {
    this.builder.shadowsEnabled = !!state;
  }

  setCameraPosition(cameraPosition) {
    this.cameraPosition = cameraPosition;

    // vvv BENCHMARK <1ms when zoomed out, ~2ms when zoomed in
    for (let s of this.sides) {
      s.quadtree.setCameraPosition(cameraPosition);
      s.quadtree.populateEdges();
    }
    // ^^^

    // vvv BENCHMARK <1ms
    // populate cross-side neighbors (now that all sides' chunks are ready)
    for (let s of this.sides) {
      s.quadtree.populateNonsideNeighbors(this.sides);
    }
    // ^^^

    let smallestActiveChunk = null;
    let updatedChunks = {};
    let newChunkTally = 0;

    this.sides.forEach((side, i) => {
      this.groups[i].matrix = side.transform;
      this.groups[i].matrixAutoUpdate = false;
      const children = side.quadtree.getChildren();
      for (let node of children) {

        const stitchingStrides = {};
        Object.keys(node.neighbors).forEach((orientation) => {
          stitchingStrides[orientation] = Math.max(1, (node.neighbors[orientation]?.size?.x || 0) / node.size.x);
        });
        const key = `${node.center.x}/${node.center.y} [${node.size.x}] [${Object.values(stitchingStrides).join('')}] [${i}]`;

        // if this chunk already exists, add to updatedChunks as-is (just update distanceToCamera)
        if (this.chunks[key]) {
          updatedChunks[key] = this.chunks[key];

        // else, allocate a new chunk
        } else {
          updatedChunks[key] = {
            position: [node.center.x, node.center.z],
            sphereCenter: node.sphereCenter,
            sphereCenterHeight: node.sphereCenterHeight,
            chunk: this.builder.allocateChunk({
              group: this.groups[i],
              minHeight: node.unstretchedMin,
              offset: new Vector3(node.center.x, node.center.y, node.center.z),
              radius: this.radius,
              side: i,
              stitchingStrides,
              shadowsEnabled: this.shadowsEnabled,
              width: node.size.x
            })
          };
          newChunkTally++;
        }

        // track the closest chunk
        if (smallestActiveChunk === null || node.size.x < smallestActiveChunk) {
          smallestActiveChunk = node.size.x;
        }
      }
    });
    this.builder.waitForChunks(newChunkTally);
    this.smallestActiveChunkSize = smallestActiveChunk;

    // recycle now-deprecated chunks
    this.builder.queueForRecycling(
      Object.keys(this.chunks)
        .filter((k) => !updatedChunks[k])
        .map((k) => this.chunks[k])
    );

    // update class
    this.chunks = updatedChunks;
  }
}

export default QuadtreeTerrainCube;
