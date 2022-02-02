
import TerrainChunk from './TerrainChunk';
import { initChunkTextures } from './TerrainChunkUtils';

class TerrainChunkManager {
  constructor(config) {
    this.config = config;
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
      chunk = this.pool[w].pop();
      chunk._params = params;
    } else {
      chunk = new TerrainChunk(params, this.config);
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
    if (this.updating) return;
    this.updating = true;

    // rebuild new chunks
    let chunk;
    while (chunk = this._queued.pop()) { // eslint-disable-line
      chunk.rebuild();
      this._new.push(chunk);
    }
    
    // recycle old chunks
    for (let node of this._old) {
      if (!this.pool[node.chunk._params.width]) {
        this.pool[node.chunk._params.width] = [];
      }
      // using pool by adding below (instead of the dispose)
      // node.chunk.dispose();
      node.chunk.detachFromGroup();
      this.pool[node.chunk._params.width].push(node.chunk);
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