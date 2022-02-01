import TerrainChunk from './TerrainChunk';

class TerrainChunkManagerThreaded {
  constructor(config, workerPool) {
    this.config = config;
    this.workerPool = workerPool;

    this.ready = true;
    this.pool = {};
    this._old = [];
  }

  isBusy() {
    return this.workerPool.isBusy() || !this.ready;
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

    this.workerPool.processInBackground(
      { topic: 'rebuildTerrainChunk', chunk: chunk.getRebuildParams() },
      (data) => {
        chunk.updateGeometry(data.chunk);
      }
    )

    return chunk;    
  }

  queueForRecycling(chunks) {
    this._old.push(...chunks);
  }

  recycleOldChunks() {
    for (let node of this._old) {
      if (!this.pool[node.chunk._params.width]) {
        this.pool[node.chunk._params.width] = [];
      }
      node.chunk.dispose();
    }
  }
}

export default TerrainChunkManagerThreaded;
