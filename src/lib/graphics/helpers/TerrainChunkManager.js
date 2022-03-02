
import TerrainChunk from './TerrainChunk';
import { initChunkTextures } from './TerrainChunkUtils';
import constants from '~/lib/constants';

const { ENABLE_TERRAIN_CHUNK_RESOURCE_POOL } = constants;

// TODO: make sure pool is entirely disposed of when switching asteroids
//  (because pool is asteroid-specific since config not updated on recycle)
class TerrainChunkManager {
  constructor(config) {
    this.config = config;
    this.csmManager = null;
    this.shadowsEnabled = false;
    this.pool = {};
    this.reset();

    this.ready = false;
    initChunkTextures().then(() => {
      this.ready = true;
    });
  }

  isBusy() {
    return this.updating || !this.ready;
  }

  reset() {
    this._queued = [];
    this._old = [];
    this._new = [];
    this.updating = false;
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
        }
      );
    }

    chunk.hide();
    chunk.attachToGroup();

    this._queued.push(chunk);

    return chunk;    
  }

  queueForRecycling(chunks) {
    this._old = [...chunks];
  }

  update() {
    console.log('update');
    
    if (this.updating) return;
    this.updating = true;

    // (re)build new chunks
    let chunk;
    while (chunk = this._queued.pop()) { // eslint-disable-line
      chunk.rebuild();
      this._new.push(chunk);
    }
    
    // recycle old chunks
    for (let node of this._old) {
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
    for (let chunk of this._new) {
      chunk.show();
    }

    // re-init for next update
    this.reset();
  }
}

export default TerrainChunkManager;