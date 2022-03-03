import {
  Group,
  Matrix4,
  Vector3
} from 'three';
import QuadtreePlane from './helpers/QuadtreePlane';
import TerrainChunkManager from './helpers/TerrainChunkManager';
import { generateHeightMap } from './helpers/TerrainChunkUtils';
import constants from '~/lib/constants';

const {
  MIN_CHUNK_SIZE,
  CHUNK_RESOLUTION,
  GEOMETRY_SHRINK,
  GEOMETRY_SHRINK_MAX
} = constants;

const dictIntersection = function(dictA, dictB) {
  const intersection = {};
  for (let k in dictB) {
    if (k in dictA) {
      intersection[k] = dictA[k];
    }
  }
  return intersection
};

const dictDifference = function(dictA, dictB) {
  const diff = {...dictA};
  for (let k in dictB) {
    delete diff[k];
  }
  return diff;
};

const cubeTransforms = [
  (new Matrix4()).makeRotationX(-Math.PI / 2), // +Y
  (new Matrix4()).makeRotationX(Math.PI / 2),  // -Y
  (new Matrix4()).makeRotationY(Math.PI / 2),  // +X
  (new Matrix4()).makeRotationY(-Math.PI / 2), // -X
  new Matrix4(),                               // +Z
  (new Matrix4()).makeRotationY(Math.PI),      // -Z
];

// N, S, E, W per side
const sideNeighbors = [
  [5,4,2,3],
  [4,5,2,3],
  [0,1,5,4],
  [0,1,4,5],
  [0,1,2,3],
  [0,1,3,4],
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

class QuadtreeCubeSphere {
  constructor(config) {
    const { radius, stretch } = config;
    this.sides = [];

    const prerenderResolution = getPrerenderResolution(radius);
    for (let i in cubeTransforms) {
      this.sides.push({
        index: i,
        transform: cubeTransforms[i].clone(),
        quadtree: new QuadtreePlane({
          size: radius,
          minChunkSize: MIN_CHUNK_SIZE,
          heightSamples: this.prerenderCoarseGeometry(
            cubeTransforms[i].clone(),
            prerenderResolution,
            config
          ),
          sampleResolution: prerenderResolution,
          localToWorld: cubeTransforms[i].clone(),
          worldStretch: stretch
        }),
      });

      // TODO: remove debug
      // if (this.sides.length === 1) break;
    }
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
      false,
      config,
      'texture'
    );
    console.log('time for coarse', Date.now() - s);

    // TODO: use Float32Array?
    const heightSamples = [];
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const bi = (resolution * (resolution - y - 1) + x) * 4; // (flip y)
        const disp = -1 + (heightMap.buffer[bi] + heightMap.buffer[bi + 1] / 255) / 128;
        heightSamples.push(config.radius * (1 + disp * config.dispWeight));
      }
    }
    return heightSamples;
  }

  setCameraPosition(position) {
    for (let s of this.sides) {
      s.quadtree.setCameraPosition(position);
    }

    // populate cross-side neighbors (now that all sides' chunks are ready)
    const childrenBySide = this.sides.map((s) => s.quadtree.getChildren());
    for (let s of this.sides) {
      const [N, S, E, W] = sideNeighbors[s.index];
      s.quadtree.populateNonsideNeighbors({
        N: childrenBySide[N] || [],
        S: childrenBySide[S] || [],
        E: childrenBySide[E] || [],
        W: childrenBySide[W] || [],
      });
    }
  }

  getSides() {
    return this.sides.map((s) => ({
      transform: s.transform,
      children: s.quadtree.getChildren()
    }));
  }
}

class QuadtreeCubeSphereManager {
  constructor(config, workerPool) {
    this.radius = config.radius;

    this.quadtreeCube = new QuadtreeCubeSphere(config);

    this.builder = new TerrainChunkManager(config, workerPool);
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

    let closestKey = null;
    let closestDistance = null;
    let updatedChunks = {};
    for (let i = 0; i < sides.length; i++) {
      this.groups[i].matrix = sides[i].transform;
      this.groups[i].matrixAutoUpdate = false;
      for (let node of sides[i].children) {
        const child = {
          index: i,
          group: this.groups[i],
          position: [node.center.x, node.center.y, node.center.z],
          bounds: node.bounds,
          size: node.size.x,
          sphereCenterHeight: node.sphereCenterHeight,
          stitchingStrides: {} 
        };
        Object.keys(node.neighbors).forEach((orientation) => {
          child.stitchingStrides[orientation] = Math.max(1, (node.neighbors[orientation]?.size?.x || 0) / child.size);
        });

        const key = `${child.position[0]}/${child.position[1]} [${child.size}] [${Object.values(child.stitchingStrides).join('')}] [${child.index}]`;
        updatedChunks[key] = child;

        if (closestDistance === null || node.distanceToCamera < closestDistance) {
          closestKey = key;
          closestDistance = node.distanceToCamera;
        }
      }
    }

    const intersection = dictIntersection(this.chunks, updatedChunks);
    const difference = dictDifference(updatedChunks, this.chunks);
    const recycle = Object.values(dictDifference(this.chunks, updatedChunks));

    // TODO: remove
    // console.log('new chunks', {
    //   keep: Object.keys(intersection).length,
    //   create: Object.keys(difference).length,
    //   recycle: recycle.length,
    // });

    // recycle recently deprecated chunks
    this.builder.queueForRecycling(recycle);

    // re-init updatedChunks to those that already exist
    updatedChunks = intersection;
    //console.log(`${Object.keys(updatedChunks).length} chunks unchanged`);

    // then create any new ones needed
    this.builder.waitForChunks(Object.keys(difference).length);
    for (let k in difference) {
      const [xp, yp, zp] = difference[k].position;

      updatedChunks[k] = {
        position: [xp, zp],
        sphereCenterHeight: difference[k].sphereCenterHeight,
        chunk: this.builder.allocateChunk({
          side: difference[k].index,
          group: difference[k].group,
          offset: new Vector3(xp, yp, zp),
          width: difference[k].size,
          radius: this.radius,
          resolution: CHUNK_RESOLUTION,
          stitchingStrides: difference[k].stitchingStrides,
          minHeight: difference[k].sphereCenterHeight - Math.min(this.radius * GEOMETRY_SHRINK, GEOMETRY_SHRINK_MAX),
          shadowsEnabled: this.shadowsEnabled
        })
      };
    }

    // update class
    this.chunks = updatedChunks;
    this.closestChunkHeight = closestKey ? this.chunks[closestKey].sphereCenterHeight : null;
  }
}

export default QuadtreeCubeSphereManager;
