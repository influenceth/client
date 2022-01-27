
// eslint-disable-next-line
import Worker from 'worker-loader!../../../worker';
import TerrainChunk from './TerrainChunk';
import { initChunkTextures } from './TerrainChunkUtils';

const worker = new Worker();

class TerrainChunkManager {
  constructor(config, useWorker) {
    this.config = config;
    this.pool = {};
    this.useWorker = useWorker || false;
    this.reset();

    this.ready = false;
    initChunkTextures().then(() => {
      this.ready = true;
    });

    // TODO: make sure this gets cleaned-up when switch asteroids
    if (this.useWorker) {
      worker.onmessage = (event) => {
        if (event.data.topic === 'rebuiltAsteroidChunks') {
          this.onBackgroundUpdateReady(event.data.chunks);
        }
      };
    }
  }

  reset() {
    this._queued = [];
    this._pending = [];
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

    this._queued.push(chunk);

    return chunk;    
  }

  queueForRecycling(chunks) {
    this._old = [...chunks];
  }

  update() {
    // don't update if still waiting on previous update
    if (this.updating) return;
    this.updating = true;

    if (this.useWorker) {
      this.updateInBackground();
    } else {
      this.updateInForeground();
    }
  }

  async updateInForeground() {
    let chunk;
    while (chunk = this._queued.pop()) { // eslint-disable-line
      await chunk.rebuild();
      this._new.push(chunk);
    }
    this.finishUpdate();
  }

  updateInBackground() {
    if (this._queued.length === 0) {
      return this.finishUpdate();
    }

    let chunk;
    while (chunk = this._queued.pop()) { // eslint-disable-line
      this._pending.push(chunk);
    }
    
    // TODO: could move config to top-level of message since common to all chunks
    worker.postMessage({
      topic: 'rebuildAsteroidChunks',
      chunks: this._pending.map((chunk) => chunk.getRebuildParams()),
    });
  }

  onBackgroundUpdateReady(updatedChunkData) {
    let i = 0;
    let chunk;
    while (chunk = this._pending.shift()) { // eslint-disable-line
      chunk.updateGeometry(updatedChunkData[i]);
      this._new.push(chunk);
      i++;
    }
    
    this.finishUpdate();
  }

  finishUpdate() {
    // recycle old chunks
    for (let node of this._old) {
      if (!this.pool[node.chunk._params.width]) {
        this.pool[node.chunk._params.width] = [];
      }
      node.chunk.destroy();
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