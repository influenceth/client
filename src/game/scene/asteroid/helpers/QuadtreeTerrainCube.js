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
//       `avg children time (over ${taskTally}): ${Math.round(1000 * taskTotal / taskTally) / 1000}ms`,
//     );
//   }
// }, 5000);
// let active = false;
// const debug = (start) => {
//   if (active) {
//     taskTally++;
//     taskTotal += performance.now() - start;
//   }
// };
// setTimeout(() => active = true, 5000);

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
      const transform = cubeTransforms[i];
      const sideIndex = parseInt(i);
      this.sides.push({
        index: sideIndex,
        transform: transform.clone(),
        quadtree: new QuadtreeTerrainPlane({
          side: sideIndex,
          size: this.radius,
          minChunkSize: this.minChunkSize,
          heightSamples: this.prerenderCoarseGeometry(
            transform.clone(),
            prerenderResolution,
            config
          ),
          sampleResolution: prerenderResolution,
          localToWorld: transform.clone(),
          worldStretch: config.stretch,
        }),
      });

      this.groups[sideIndex].matrix = transform.clone();
      this.groups[sideIndex].matrixAutoUpdate = false;

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

  setShadowsEnabled(state) {
    this.builder.shadowsEnabled = !!state;
  }

  setCameraPosition(cameraPosition) {
    this.cameraPosition = cameraPosition;

    // vvv BENCHMARK 0.3 - 0.7ms (depending on zoom) -- 95% of that is setCameraPosition
    // TODO: could we move setCameraPosition to a webworker for an improvement?
    for (let s of this.sides) {
      s.quadtree.setCameraPosition(cameraPosition);
      s.quadtree.populateEdges();
    }
    // ^^^

    // vvv BENCHMARK 0.05ms
    // populate cross-side neighbors (now that all sides' chunks are ready)
    for (let s of this.sides) {
      s.quadtree.populateNonsideNeighbors(this.sides);
    }
    // ^^^

    // vvv BENCHMARK 0.1ms (zoomed out) --> 5.5ms (zoomed in)
    // TODO: can we improve the zoomed-in benchmark? probably related
    //  to multiple-array traversals per loop... potentially could 
    //  put into a more usable data structure and get better performance
    // const x = performance.now();
    
    // create a list of changes to make, sorted by closest to farthest
    const queuedChangesObj = {};

    // if no chunks, then single update with all children
    if (Object.keys(this.chunks).length === 0) {
      queuedChangesObj.initial = {
        _distance: 0,
        remove: [],
        add: this.sides.reduce((acc, side) => [...acc, ...Object.values(side.quadtree.getChildren())], [])
      };
    } else {
      this.sides.forEach((side) => {
        const newQuads = side.quadtree.getChildren();

        Object.keys(this.chunks).forEach((renderKey) => {
          const chunk = this.chunks[renderKey];

          // if no changes to this quad's split, may still need to rebuild if stitching changed
          if (newQuads[chunk.key]) {
            const newChunk = newQuads[chunk.key];
            this.populateNodeStridesAndRenderKey(newChunk);

            // calculate "renderKey"... if not same as old chunk, needs rebuild
            // TODO: since this group can get big, might be good to break up by side
            if (newChunk.renderKey !== renderKey) {
              if (!queuedChangesObj.rebuild) {
                queuedChangesObj.rebuild = { add: [], removeByKey: [] };
              }
              queuedChangesObj.rebuild.add.push(newChunk);
              queuedChangesObj.rebuild.removeByKey.push(renderKey);
            }
          } else {
            // if zooming in, removing current and adding sub-quads
            const descendents = Object.keys(newQuads).reduce((acc, cur) => {
              if (cur.indexOf(`${chunk.key}.`) === 0) acc.push(newQuads[cur]);
              return acc;
            }, []);
            if (descendents.length > 0) {
              queuedChangesObj[chunk.key] = {
                _distance: descendents.reduce((acc, cur) => Math.min(acc, cur.distanceToCamera), Infinity),
                remove: [chunk],
                add: descendents,
              };

            // else, zooming out, adding ancestor and removing current (w/ siblings)
            } else {
              const closestAncestorKey = Object.keys(newQuads)
                .filter((k) => chunk.key.indexOf(`${k}.`) === 0)
                .sort((a, b) => b.length - a.length)
                .shift();
              if (closestAncestorKey) {
                if (!queuedChangesObj[closestAncestorKey]) {
                  queuedChangesObj[closestAncestorKey] = {
                    _distance: newQuads[closestAncestorKey].distanceToCamera,
                    add: [newQuads[closestAncestorKey]],
                    remove: []
                  }
                }
                queuedChangesObj[closestAncestorKey].remove.push(chunk);
              }
            }
          }
        });
      });
      if (queuedChangesObj.rebuild) {
        // TODO: should filter by those that actually have stride changes, otherwise
        //  unchanged quad might be closest to camera
        queuedChangesObj.rebuild._distance = queuedChangesObj.rebuild.add.reduce((acc, cur) => Math.min(acc, cur.distanceToCamera), Infinity);
      }
    }

    this.queuedChanges = Object.values(queuedChangesObj)
      .sort((a, b) => a._distance - b._distance);

    // debug(x);
    // ^^^
  }

  populateNodeStridesAndRenderKey(node) {
    if (!node.stitchingStrides) {
      if (node.chunk?._params?.stitchingStrides) {
        node.stitchingStrides = node.chunk?._params?.stitchingStrides;
      } else if (node.neighbors) {
        const stitchingStrides = {};
        Object.keys(node.neighbors).forEach((orientation) => {
          stitchingStrides[orientation] = Math.max(1, (node.neighbors[orientation]?.size?.x || 0) / node.size.x);
        });
        node.stitchingStrides = stitchingStrides;
      }
    }
    if (!node.renderKey) {
      node.renderKey = `${node.key} [${Object.values(node.stitchingStrides).join('')}]`;
    }
  }

  // TODO (enhancement): could pre-populate the pool more
  processNextQueuedChange() {
    if (this.queuedChanges.length === 0) {
      // console.log('FINISHED!');
      return;
    }
    // console.log('queue length', this.queuedChanges.length);
    
    const { add, remove, removeByKey } = this.queuedChanges.shift();
    
    // TODO: (redo) vvv BENCHMARK trends to <0.6ms as chunk pool is established
    // TODO (enhancement): could pre-build more chunks for pool?

    // kick-off chunks to rebuild
    add.forEach((node) => {
      this.populateNodeStridesAndRenderKey(node);
      this.chunks[node.renderKey] = {
        key: node.key,
        position: [node.center.x, node.center.z],
        size: node.size.x,
        sphereCenter: node.sphereCenter,
        sphereCenterHeight: node.sphereCenterHeight,
        chunk: this.builder.allocateChunk({
          group: this.groups[node.side],
          minHeight: node.unstretchedMin,
          offset: new Vector3(node.center.x, node.center.y, node.center.z),
          radius: this.radius,
          side: node.side,
          stitchingStrides: node.stitchingStrides,
          shadowsEnabled: this.shadowsEnabled,
          width: node.size.x
        })
      };
    });
    this.builder.waitForChunks(add.length);

    // kick-off chunks to recycle
    const removeChunks = [
      ...(remove || []),
      ...(removeByKey || []).map((k) => this.chunks[k])
    ];
    this.builder.queueForRecycling(removeChunks);

    // remove references to recycled chunks
    // TODO: make sure this doesn't delete the removeChunks records
    removeChunks.forEach((c) => {
      this.populateNodeStridesAndRenderKey(c);
      delete this.chunks[c.renderKey];
    })

    // recalculate smallest active chunk
    this.smallestActiveChunkSize = Object.values(this.chunks).reduce((acc, node) => {
      return (acc === null || node.size < acc) ? node.size : acc;
    }, null);
  }
}

export default QuadtreeTerrainCube;
