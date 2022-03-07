import {
  Group,
  Vector3
} from 'three';
import QuadtreeCubeSphere from './helpers/QuadtreeCube';
import TerrainChunkManager from './helpers/TerrainChunkManager';
import constants from '~/lib/constants';

const {
  CHUNK_RESOLUTION,
  GEOMETRY_SHRINK,
  GEOMETRY_SHRINK_MAX
} = constants;

// TODO: remove
let taskTotal = 0;
let taskTally = 0;
setInterval(() => {
  if (taskTally > 0) {
    console.log(
      `avg children time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
    );
  }
}, 5000);

class QuadtreeCubeSphereManager {
  constructor(i, config, workerPool) {
    this.radius = config.radius;
    this.smallestActiveChunkSize = 2 * config.radius;

    this.quadtreeCube = new QuadtreeCubeSphere(config);

    this.builder = new TerrainChunkManager(i, config, workerPool);
    this.groups = [...new Array(6)].map(_ => new Group());
    this.chunks = {};
  }

  dispose() {
    Object.values(this.chunks).forEach(({ chunk }) => chunk.dispose());
    this.builder.dispose();
  }

  setCSM(csmManager) {
    this.csm = csmManager;
    this.builder.csmManager = this.csm;
  }

  setShadowsEnabled(state) {
    this.builder.shadowsEnabled = !!state;
  }

  setCameraPosition(cameraPosition) {
    this.quadtreeCube.setCameraPosition(cameraPosition);

    const sides = this.quadtreeCube.getSides();

    let smallestActiveChunk = null;
    let updatedChunks = {};
    let newChunkTally = 0;
    for (let i = 0; i < sides.length; i++) {
      this.groups[i].matrix = sides[i].transform;
      this.groups[i].matrixAutoUpdate = false;
      for (let node of sides[i].children) {

        const stitchingStrides = {};
        Object.keys(node.neighbors).forEach((orientation) => {
          stitchingStrides[orientation] = Math.max(1, (node.neighbors[orientation]?.size?.x || 0) / node.size.x);
        });
        const key = `${node.center.x}/${node.center.y} [${node.size.x}] [${Object.values(stitchingStrides).join('')}] [${i}]`;

        // if this chunk already exists, init in updatedChunks
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
              resolution: CHUNK_RESOLUTION,
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
    }
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

export default QuadtreeCubeSphereManager;
