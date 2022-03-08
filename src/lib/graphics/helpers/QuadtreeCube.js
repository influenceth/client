import {
  Matrix4,
  Vector3
} from 'three';
import QuadtreePlane from './QuadtreePlane';
import { generateHeightMap } from './TerrainChunkUtils';

import constants from '~/lib/constants';

const {
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
  constructor(config, sides) {
    if (sides) {
      this.sides = sides;
      return;

    } else {
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
  }

  // preprocess geometry from high-res texture
  prerenderCoarseGeometry(sideTransform, resolution, config) {

    // TODO: move to worker? if do, update heightSamples so can "transfer" buffer
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
    // console.log('time for coarse', Date.now() - s);

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
    // vvv BENCHMARK <1ms when zoomed out, ~2ms when zoomed in
    for (let s of this.sides) {
      s.quadtree.setCameraPosition(position);
    }
    // ^^^
    
    // vvv BENCHMARK <1ms
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
    // ^^^
  }

  getSides() {
    return this.sides.map((s) => ({
      transform: s.transform,
      children: s.quadtree.getChildren()
    }));
  }
}

export default QuadtreeCubeSphere;
