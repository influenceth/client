
import TerrainChunk from './TerrainChunk';
import { initChunkTextures, rebuildChunkMaps } from './TerrainChunkUtils';
import constants from '~/lib/constants';

const { ENABLE_TERRAIN_CHUNK_RESOURCE_POOL } = constants;

// // TODO: remove
// let taskTotal = 0;
// let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg new chunk time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
//     );
//   }
// }, 5000);

class TerrainChunkManager {
  constructor(i, config, textureSize, workerPool, materialOverrides = {}) {
    this.asteroidId = i;
    this.config = config;
    this.workerPool = workerPool;
    this.materialOverrides = materialOverrides;

    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = this.config;
    this.prunedConfig = prunedConfig; // for passing to webworker

    this.shadowsEnabled = false;
    this.textureSize = textureSize;
    this.pool = [];
    this.emissivePool = [];
    this.reset();

    this.ready = false;
    initChunkTextures().then(() => { this.ready = true; });
  }

  dispose() {
    let chunk;
    while(chunk = this.pool.pop()) chunk.dispose(); // eslint-disable-line no-cond-assign
    while(chunk = this.emissivePool.pop()) chunk.dispose(); // eslint-disable-line no-cond-assign
    this.reset(); // (not sure if this is necessary)
  }

  isBusy() {
    return !this.ready || this.waitingOn > this._new.length;
  }

  isUpdating() {
    return this.waitingOn > 0;
  }

  isWaitingOnMaps() {
    // TODO (enhancement): ">=" should be "===" but occasionally on initial asteroid load, extra 6 (initial sides) get put in _new
    //  (should track down at some point)
    return this.waitingOn > 0 && (this._new.length < this.waitingOn);
  }

  reset() {
    this.waitingOn = 0;
    this._queued = [];
    this._old = [];
    this._new = [];
  }

  allocateChunk(params) {
    const poolToUse = !!params.emissiveParams?.color ? this.emissivePool : this.pool;
    let chunk = poolToUse.pop();
    if (chunk) { // console.log('reuse');
      chunk.reconfigure(params);
    } else {  // console.log('create');
      chunk = new TerrainChunk(
        params,
        this.config,
        {
          materialOverrides: this.materialOverrides,
          resolution: this.textureSize,
          shadowsEnabled: this.shadowsEnabled,
        },
        this.workerPool
      );
    }

    // hide chunk
    chunk.hide();
    chunk.attachToGroup();

    // trigger geometry and map updates (will queue for display when complete)
    const scope = this;
    this.workerPool.processInBackground(
      {
        topic: 'rebuildTerrainGeometry',
        asteroid: {
          key: this.asteroidId,
          config: this.prunedConfig,
        },
        chunk: {
          edgeStrides: chunk._params.stitchingStrides,
          emissiveParams: chunk._params.emissiveParams,
          offset: chunk._params.offset.toArray(),
          width: chunk._params.width,
          groupMatrix: chunk._params.group.matrix.clone(),
          minHeight: chunk._params.minHeight,
          resolution: this.textureSize,
          side: chunk._params.side,
          stretch: chunk._stretch.toArray(),
        },
        _cacheable: 'asteroid'
      },
      ({ positions, normals }) => {
        chunk.updateGeometry(positions, normals);
        scope._queued.push(chunk);
      }
    );

    return chunk;
  }

  waitForChunks(howMany) {
    this.waitingOn = howMany;
  }

  queueForRecycling(chunks) {
    // this._old = [...chunks];
    this._old = chunks; // doesn't seem like this needs clone, so not wasting resources
  }

  updateMaps(until) {
    let chunk;

    // NOTE: deliberately always do at least one
    while (chunk = this._queued.pop()) { // eslint-disable-line
      chunk.updateMaps(
        rebuildChunkMaps(
          {
            config: this.config,
            edgeStrides: chunk._params.stitchingStrides,
            emissiveParams: chunk._params.emissiveParams,
            groupMatrix: chunk._params.group.matrix.clone(),
            offset: chunk._params.offset.clone(),
            resolution: chunk._resolution,
            side: chunk._params.side,
            width: chunk._params.width
          },
        )
      );
      this._new.push(chunk);

      // limit processing time (i.e. for FPS)
      if (until && Date.now() > until) {
        // console.log('truncate processing', this._new.length);
        break;
      }
    }
  }

  update() {
    if (this.isBusy()) return;
    // console.log(`adding ${this._new.length} chunks, removing ${this._old.length} chunks`);

    // recycle old chunks
    let node;
    while (node = this._old.pop()) { // eslint-disable-line
      if (ENABLE_TERRAIN_CHUNK_RESOURCE_POOL && node.chunk.isReusable()) {
        node.chunk.detachFromGroup();
        const poolToUse = !!node.chunk._params.emissiveParams?.color ? this.emissivePool : this.pool;
        poolToUse.push(node.chunk);
      } else {
        node.chunk.dispose();
      }
    }

    // show new chunks
    let chunk;
    while (chunk = this._new.pop()) { // eslint-disable-line
      chunk.show();
    }

    // re-init for next update
    this.reset();
  }
}

export default TerrainChunkManager;