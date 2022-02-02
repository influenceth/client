import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Mesh,
} from 'three';

import { rebuildChunkGeometry } from './TerrainChunkUtils';

// TODO: remove debug
let first = true;
let taskTotal = 0;
let taskTally = 0;
setInterval(() => {
  if (taskTally > 0) {
    console.log(
      `avg execution time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
    );
  }
  first = true;
}, 5000);

class TerrainChunk {
  constructor(params, config, textureRenderer) {
    this._params = params;
    this._config = config;
    this._textureRenderer = textureRenderer;

    this._geometry = new BufferGeometry();
    this._material = params.material.clone();
    this._plane = new Mesh(this._geometry, this._material);
    this._plane.castShadow = false;
    this._plane.receiveShadow = true;
  }

  attachToGroup() {
    this._params.group.add(this._plane);
  }

  detachFromGroup() {
    this._params.group.remove(this._plane);
  }
  
  dispose() {
    this.detachFromGroup();
    this._geometry.dispose();
    this._material.dispose();
  }

  hide() {
    this._plane.visible = false;
  }

  show() {
    if (!this._plane.visible) {
      this._plane.visible = true;
    }
  }

  getRebuildParams() {
    // TODO: this manipulation is probably only worth it when using postMessage
    //  (i.e. not for work on main thread)
    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = this._config;
    return {
      // TODO: could cache
      config: prunedConfig,
      resolution: this._params.resolution,

      // TODO: specific to chunk
      groupMatrix: this._params.group.matrix.clone(),
      offset: this._params.offset.clone(),
      side: this._params.side,
      width: this._params.width
    }
  }

  rebuild() {
    const params = this.getRebuildParams();
    const startTime = Date.now();
    const chunk = rebuildChunkGeometry(params);
    if (true) {
      taskTotal += Date.now() - startTime;
      taskTally++;
    }
    this.updateGeometry(chunk);
  }

  updateGeometry(data) {
    if (!data) return;

    // TODO: can we use planeGeometry?
    // TODO: uvs are consistent if resolution is consistent... don't need to update each time
    
    this._geometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    this._geometry.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    this._geometry.setIndex(new BufferAttribute(data.indices, 1));

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.uv.needsUpdate = true;
    this._geometry.computeVertexNormals();


    const displacementScale = 2 * this._config.radius * this._config.dispWeight;
    const displacementMapTexture = new CanvasTexture(data.displacementBitmap);

    if (false && first) {
      const debug = 'displacementBitmap';
      first = false;
      const canvas = document.getElementById('test_canvas');
      canvas.style.height = `${data[debug].height}px`;
      canvas.style.width = `${data[debug].width}px`;
      const ctx = canvas.getContext('bitmaprenderer');
      ctx.transferFromImageBitmap(data[debug]);
    } else {
      this._material.setValues({
        displacementBias: -displacementScale / 2,
        displacementMap: displacementMapTexture,
        displacementScale: displacementScale,
        map: new CanvasTexture(data.colorBitmap),
        normalMap: new CanvasTexture(data.normalBitmap),
      });
      this._material.needsUpdate = true;
    }
  }
}

export default TerrainChunk;