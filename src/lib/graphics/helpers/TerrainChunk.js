import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Mesh } from 'three';

import { rebuildChunkGeometry } from './TerrainChunkUtils';

class TerrainChunk {
  constructor(params, config, textureRenderer) {
    this._params = params;
    this._config = config;
    this._textureRenderer = textureRenderer;
    
    this._geometry = new BufferGeometry();
    this._plane = new Mesh(this._geometry, params.material);
    this._plane.castShadow = false;
    this._plane.receiveShadow = true;
    this._params.group.add(this._plane);
  }
  
  dispose() {
    this._params.group.remove(this._plane);
    this._geometry.dispose();
  }

  hide() {
    this._plane.visible = false;
  }

  show() {
    this._plane.visible = true;
  }

  getRebuildParams() {
    return {
      config: this._config,
      groupMatrix: this._params.group.matrix.clone(),
      offset: this._params.offset.clone(),
      radius: this._params.radius,
      resolution: this._params.resolution,
      side: this._params.side,
      width: this._params.width
    }
  }

  rebuild() {
    this.updateGeometry(
      rebuildChunkGeometry(
        this.getRebuildParams()
      )
    );
  }

  updateGeometry(data) {
    if (!data) return;
    this._geometry.setAttribute(
      'position', new Float32BufferAttribute(data.positions, 3));
    this._geometry.setAttribute(
      'color', new Float32BufferAttribute(data.colors, 3));
    this._geometry.setAttribute(
      'normal', new Float32BufferAttribute(data.normals, 3));
    this._geometry.setIndex(
      new BufferAttribute(new Uint32Array(data.indices), 1));
  }
}

export default TerrainChunk;