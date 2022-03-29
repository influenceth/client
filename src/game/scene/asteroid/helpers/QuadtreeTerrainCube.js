import {
  Group,
  Matrix4,
  Vector3
} from 'three';
import QuadtreeTerrainPlane from './QuadtreeTerrainPlane';
import TerrainChunkManager from './TerrainChunkManager';
import { generateHeightMap } from './TerrainChunkUtils';
import constants from '~/lib/constants';

const {
  GEOMETRY_SHRINK,
  GEOMETRY_SHRINK_MAX,
  MIN_CHUNK_SIZE
} = constants;

const cubeTransforms = [
  (new Matrix4()).makeRotationX(-Math.PI / 2), // +Y
  (new Matrix4()).makeRotationX(Math.PI / 2),  // -Y
  (new Matrix4()).makeRotationY(Math.PI / 2),  // +X
  (new Matrix4()).makeRotationY(-Math.PI / 2), // -X
  new Matrix4(),                               // +Z
  (new Matrix4()).makeRotationY(Math.PI),      // -Z
];

const getPrerenderResolution = (radius) => {
  const targetResolution = 2 * radius / MIN_CHUNK_SIZE;
  if (targetResolution < 32) return 16;
  if (targetResolution < 64) return 32;
  if (targetResolution < 128) return 64;
  if (targetResolution < 256) return 128;
  if (targetResolution < 512) return 256;
  if (targetResolution < 1024) return 512;
  return 1024;
};

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
  constructor(i, config, textureSize, workerPool) {
    this.radius = config.radius;
    this.cameraPosition = null;
    this.smallestActiveChunkSize = 2 * this.radius;

    this.builder = new TerrainChunkManager(i, config, textureSize, workerPool);
    this.groups = [...new Array(6)].map(_ => new Group());
    this.chunks = {};

    // build the sides of the cube (each a quadtreeplane)
    this.sides = [];
    const prerenderResolution = getPrerenderResolution(this.radius);
    for (let i in cubeTransforms) {
      this.sides.push({
        index: i,
        transform: cubeTransforms[i].clone(),
        quadtree: new QuadtreeTerrainPlane({
          side: i,
          size: this.radius,
          minChunkSize: MIN_CHUNK_SIZE,
          heightSamples: this.prerenderCoarseGeometry(
            cubeTransforms[i].clone(),
            prerenderResolution,
            config
          ),
          sampleResolution: prerenderResolution,
          localToWorld: cubeTransforms[i].clone(),
          worldStretch: config.stretch,
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
    const s = Date.now();
    const heightMap = generateHeightMap(
      sideTransform,
      1,
      new Vector3(0, 0, 0),
      resolution,
      { N: 1, S: 1, E: 1, W: 1 },
      0,
      false,
      config,
      'texture'
    );
    // console.log('time for coarse', Date.now() - s);

    const heightSamples = [];
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const bi = (resolution * (resolution - y - 1) + x) * 4; // (flip y)
        const disp = -1 + (heightMap.buffer[bi] + heightMap.buffer[bi + 1] / 255) / 127.5;
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
              side: i,
              group: this.groups[i],
              offset: new Vector3(node.center.x, node.center.y, node.center.z),
              width: node.size.x,
              radius: this.radius,
              stitchingStrides,
              minHeight: node.sphereCenterHeight - Math.min(this.radius * GEOMETRY_SHRINK, GEOMETRY_SHRINK_MAX),
              shadowsEnabled: this.shadowsEnabled
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
