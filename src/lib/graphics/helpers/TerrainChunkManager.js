
import TerrainChunk from './TerrainChunk';
import { initChunkTextures, rebuildChunkMaps } from './TerrainChunkUtils';
import constants from '~/lib/constants';

const {
  ENABLE_TERRAIN_CHUNK_RESOURCE_POOL,
} = constants;

class TerrainChunkManager {
  constructor(config, workerPool) {
    this.config = config;
    this.csmManager = null;
    this.shadowsEnabled = false;
    this.workerPool = workerPool;
    this.pool = {};
    this.reset();

    this.ready = false;
    initChunkTextures().then(() => {
      this.ready = true;
    });
  }

  isBusy() {
    // TODO: do we need workerPool check in here?
    return !this.ready || this.workerPool.isBusy() || this.waitingOn > this._new.length;
  }

  isPreparingUpdate() {
    return this.waitingOn > 0;
  }

  isReadyToFinish() {
    return this.waitingOn > 0 && (this._new.length === this.waitingOn);
  }

  reset() {
    this.waitingOn = 0;
    this._queued = [];
    this._old = [];
    this._new = [];
  }

  allocateChunk(params) {
    const w = params.width;

    if (!this.pool[w]) {
      this.pool[w] = [];
    }

    let chunk = null;
    if (this.pool[w].length > 0) {
      // console.log('reuse', w);
      chunk = this.pool[w].pop();
      chunk.reconfigure(params);
    } else {
      // console.log('create', w);
      chunk = new TerrainChunk(
        params,
        this.config,
        {
          csmManager: this.csmManager,
          shadowsEnabled: this.shadowsEnabled,
        },
        this.workerPool
      );
    }

    chunk.hide();
    chunk.attachToGroup();

    // TODO: the leaner we can make params, the better for webworker
    // TODO: make sure passing buffer by reference
    const scope = this;
    this.workerPool.processInBackground(
      {
        topic: 'rebuildTerrainGeometry',
        chunk: {
          edgeStrides: chunk._params.stitchingStrides,
          heightScale: chunk._heightScale,
          offset: chunk._params.offset.toArray(),
          radius: scope.config.radius,
          resolution: chunk._params.resolution,
          width: chunk._params.width,
        }
      },
      ({ positions }) => {
        chunk.updateGeometry(positions);
        scope._queued.push(chunk);
      }
    );

    return chunk;
  }

  waitForChunks(howMany) {
    this.waitingOn = howMany;
  }

  queueForRecycling(chunks) {
    this._old = [...chunks];
  }

  // TODO: limit per call so limited per frame?
  updateMaps(until) {
    let chunk;
    while (chunk = this._queued.pop()) { // eslint-disable-line
      chunk.updateMaps(
        rebuildChunkMaps({
          config: this.config,
          edgeStrides: chunk._params.stitchingStrides,
          groupMatrix: chunk._params.group.matrix.clone(),
          offset: chunk._params.offset.clone(),
          resolution: chunk._params.resolution,
          width: chunk._params.width,
        })
      );
      this._new.push(chunk);

      // limit processing time (i.e. for FPS)
      if (until && Date.now() > until) {
        console.log('abort processing', this._new.length);
        break;
      }
    }
  }

  update() {
    if (this.isBusy()) return;
    console.log(`adding ${this._new.length} chunks, removing ${this._old.length} chunks`);

    // recycle old chunks
    let node;
    while (node = this._old.pop()) { // eslint-disable-line
      // (pool bucket should already exist, but sanity-insurance)
      if (!this.pool[node.chunk._params.width]) {
        this.pool[node.chunk._params.width] = [];
      }
      if (ENABLE_TERRAIN_CHUNK_RESOURCE_POOL && node.chunk.isReusable()) {
        node.chunk.detachFromGroup();
        this.pool[node.chunk._params.width].push(node.chunk);
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