import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  FrontSide,
  LessDepth,
  Mesh,
  MeshStandardMaterial,
  Vector3
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

// TODO: geometry is static per chunk... only rebuild on re-allocation (i.e. move)
//  uvs and indices are now static per resolution (can build once and copy)
//  build once, use the pool

// NOTE: could probably fix flipY issue by flipping Y in uv's instead of in every shader

class TerrainChunk {
  constructor(params, config, textureRenderer) {
    this._params = params;
    this._config = config;
    this._textureRenderer = textureRenderer;

    // transform stretch per side
    let stretch;
    if ([0,1].includes(this._params.side)) {
      stretch = new Vector3(config.stretch.x, config.stretch.z, config.stretch.y);
    } else if ([2,3].includes(this._params.side)) {
      stretch = new Vector3(config.stretch.z, config.stretch.y, config.stretch.x);
    } else {
      stretch = config.stretch.clone();
    }

    this._geometry = new BufferGeometry();
    this._material = new MeshStandardMaterial({
      color: 0xFFFFFF,
      depthFunc: LessDepth,
      dithering: true,
      metalness: 0,
      roughness: 1,
      side: FrontSide,
      // wireframe: true,
      onBeforeCompile: function (shader) {
        shader.uniforms.uRadius = { type: 'f', value: config.radius };
        shader.uniforms.uStretch = { type: 'v3', value: stretch };
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <displacementmap_pars_vertex>',
            `#include <displacementmap_pars_vertex>
            uniform float uRadius;
            uniform vec3 uStretch;`
          )
          .replace(
            '#include <displacementmap_vertex>',
            `#ifdef USE_DISPLACEMENTMAP
              vec2 disp16 = texture2D(displacementMap, vUv).xy;
              float disp = (disp16.x * 255.0 + disp16.y) / 255.0;
              transformed += normalize( objectNormal ) * (disp * displacementScale + displacementBias );
              transformed += transformed * (uStretch - 1.0);
            #endif`
          );
      }
    });
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
        displacementMap: new CanvasTexture(data.heightBitmap),
        displacementScale: displacementScale,
        map: new CanvasTexture(data.colorBitmap),
        //normalMap: new CanvasTexture(data.normalBitmap),
      });
      this._material.needsUpdate = true;
    }
  }
}

export default TerrainChunk;