import {
  Group,
  Matrix4,
  Vector3
} from 'three';
import QuadtreePlane from './helpers/QuadtreePlane';
import TerrainChunkManager from './helpers/TerrainChunkManager';
import TerrainChunkManagerThreaded from './helpers/TerrainChunkManagerThreaded';
import { generateHeightMap } from './helpers/TerrainChunkUtils';
import constants from '~/lib/constants';

const {
  ENABLE_TERRAIN_CHUNK_MULTITHREADING,
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
      if (this.sides.length === 1) break;
    }
  }

  // preprocess geometry from high-res texture
  prerenderCoarseGeometry(sideTransform, resolution, config) {

    // TODO: remove debug
    const debug1 = generateHeightMap(
      sideTransform,
      0.5,
      new Vector3(0.5, -0.5, 0),
      CHUNK_RESOLUTION + 1,
      { N: 1, S: 1, E: 1, W: 1 },
      config,
      'texture'
    );
    const debug2 = generateHeightMap(
      sideTransform,
      0.25,
      new Vector3(-0.25, -0.25, 0),
      CHUNK_RESOLUTION + 1,
      { N: 2, S: 1, E: 2, W: 1 },
      config,
      'texture'
    );

    const x1 = 0;
    const x2 = CHUNK_RESOLUTION;
    const r = CHUNK_RESOLUTION + 1;
    for (let y = 0; y < r; y++) {
      const bi1 = (r * (r - y - 1) + x1) * 4; // (flip y)
      const bi2 = (r * (r - y - 1) + x2) * 4; // (flip y)
      const log = [
        [
          debug1.buffer[bi1],
          debug1.buffer[bi1+1],
          debug1.buffer[bi1+2],
          debug1.buffer[bi1+3],
        ].join(','),
        [
          debug2.buffer[bi2],
          debug2.buffer[bi2+1],
          debug2.buffer[bi2+2],
          debug2.buffer[bi2+3],
        ].join(','),
        // (debug1.buffer[bi1] * 255 + debug1.buffer[bi1+1]) / 256,
        // (debug2.buffer[bi2] * 255 + debug2.buffer[bi2+1]) / 256,
      ];
      // if (y >= CHUNK_RESOLUTION / 2) {
      //   const y2 = (y - CHUNK_RESOLUTION / 2) * 2;
      //   const bi2 = (r * (r - y2 - 1) + x2) * 4; // (flip y)
      //   if (Math.round(bi2) == bi2) {
      //     log.push([
      //       debug2.buffer[bi2],
      //       debug2.buffer[bi2+1],
      //       debug2.buffer[bi2+2],
      //       debug2.buffer[bi2+3],
      //     ].join(','));
      //   }
      // }
      console.log(log);
    }

    const s = Date.now();
    const heightMap = generateHeightMap(
      sideTransform,
      1,
      new Vector3(0, 0, 0),
      resolution,
      { N: 1, S: 1, E: 1, W: 1 }, 
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

    this.threaded = ENABLE_TERRAIN_CHUNK_MULTITHREADING && !!workerPool;
    if (this.threaded) {
      this.builder = new TerrainChunkManagerThreaded(config, workerPool); 
    } else {
      this.builder = new TerrainChunkManager(config);
    }
    this.groups = [...new Array(6)].map(_ => new Group());
    this.chunks = {};
  }

  // TODO: remove debug
  debug() {
    const coords = [];
    this.quadtreeCube.sides.forEach(({ quadtree }) => {
      quadtree.getChildren().forEach((node) => {
        coords.push(...Object.values(node.sphereCenter));
      });
    });
    return coords;

    // const coords = [];
    // const resolution = Math.sqrt(this.quadtreeCube.sides[0].quadtree.heightSamples.length);
    // const width = 2 * this.radius;
    // const half = this.radius;
    // this.quadtreeCube.sides.forEach(({ transform, quadtree: { heightSamples } }) => {
    //   for (let x = 0; x < resolution; x++) {
    //     for (let y = 0; y < resolution; y++) {
    //       const _P = new Vector3(
    //         width * (x + 0.5) / resolution - half,
    //         width * (y + 0.5) / resolution - half,
    //         this.radius
    //       );
    //       _P.applyMatrix4(transform);
    //       _P.normalize();
    //       _P.setLength(heightSamples[resolution * y + x]);
    //       coords.push(_P.x, _P.y, _P.z);
    //     }
    //   }
    // });
    // return coords;
  }

  dispose() {
    Object.values(this.chunks).forEach(({ chunk }) => chunk.dispose());
  }

  setCameraPosition(cameraPosition) {
    this.quadtreeCube.setCameraPosition(cameraPosition);

    const sides = this.quadtreeCube.getSides();

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

    // then create any new ones needed
    for (let k in difference) {
      const [xp, yp, zp] = difference[k].position;

      const offset = new Vector3(xp, yp, zp);
      updatedChunks[k] = {
        position: [xp, zp],
        chunk: this.createChunk(
          difference[k].index,
          difference[k].group,
          offset,
          difference[k].size,
          difference[k].sphereCenterHeight - Math.min(this.radius * GEOMETRY_SHRINK, GEOMETRY_SHRINK_MAX),
          difference[k].stitchingStrides,
          CHUNK_RESOLUTION
        ),
      };
    }

    // update class
    this.chunks = updatedChunks;

    // manually kick off update here if not threaded
    if (!this.threaded) {
      this.builder.update();
    }
  }

  finishPendingUpdate() {
    // if not threaded, this is already handled within builder
    if (this.threaded) {
      this.builder.recycleOldChunks();
      for (let k in this.chunks) {
        this.chunks[k].chunk.show();
      }
    }
  }

  createChunk(side, group, offset, width, minHeight, stitchingStrides, resolution) {
    return this.builder.allocateChunk({
      side,
      group: group,
      width: width,
      offset: offset,
      radius: this.radius,
      resolution,
      stitchingStrides,
      minHeight
    });
  }
}

export default QuadtreeCubeSphereManager;
