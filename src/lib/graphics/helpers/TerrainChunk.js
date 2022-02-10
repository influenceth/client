import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  FrontSide,
  LessDepth,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  Vector3
} from 'three';

import constants from '~/lib/constants';
import { rebuildChunkGeometry } from './TerrainChunkUtils';

const { CHUNK_RESOLUTION } = constants;

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

    const _heightScale = params.minHeight / this._config.radius;
    this._heightScale = _heightScale;

    // transform stretch per side
    let stretch;
    if ([0,1].includes(this._params.side)) {
      stretch = new Vector3(config.stretch.x, config.stretch.z, config.stretch.y);
    } else if ([2,3].includes(this._params.side)) {
      stretch = new Vector3(config.stretch.z, config.stretch.y, config.stretch.x);
    } else {
      stretch = config.stretch.clone();
    }

    const displacementScale = 2 * this._config.radius * this._config.dispWeight;
    const displacementBias = -displacementScale / 2;

    this._geometry = new BufferGeometry();
    this.initGeometry();

    this._material = new MeshStandardMaterial({
      color: 0xFFFFFF,
      depthFunc: LessDepth,
      displacementBias,
      displacementScale,
      dithering: true,
      metalness: 0,
      roughness: 1,
      side: FrontSide,
      // wireframe: true,
      onBeforeCompile: function (shader) {
        shader.uniforms.uHeightScale = { type: 'f', value: _heightScale };
        shader.uniforms.uStretch = { type: 'v3', value: stretch };
        shader.vertexShader = `
          uniform float uHeightScale;
          uniform vec3 uStretch;
          ${shader.vertexShader.replace(
            '#include <displacementmap_vertex>',
            `#ifdef USE_DISPLACEMENTMAP
              vec2 disp16 = texture2D(displacementMap, vUv).xy;
              float disp = (disp16.x * 255.0 + disp16.y) / 256.0;
              // stretch back to radius (geometry initialized at minHeight for chunk)
              transformed /= uHeightScale;
              // displace along normal
              transformed += normalize( objectNormal ) * (disp * displacementScale + displacementBias);
              // stretch along normal
              transformed *= uStretch;
            #endif`
          )}
        `;
      }
    });

    // TODO: skirts (could pass edge (1/0) in extra displacementMap channel) (would allow for better edge-normal sampling)


    this._plane = new Mesh(this._geometry, this._material);
    this._plane.castShadow = false;
    this._plane.receiveShadow = true;
    // if (first) { first= false; console.log(this._plane);}
    // this._plane.onBeforeRender = function (renderer) {
    //   renderer.shadowMap.enabled = true;
    //   renderer.shadowMap.type = PCFSoftShadowMap;
    // };
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
      width: this._params.width,
      heightScale: this._heightScale,
      // side: this._params.side,
    }
  }

  rebuild() {
    console.log('rebuild');
    const startTime = Date.now();
    const chunk = rebuildChunkGeometry(
      this.getRebuildParams()
    );
    if (true) {
      taskTotal += Date.now() - startTime;
      taskTally++;
    }
    this.updateGeometry(chunk);
  }

  initGeometry() {
    const resolution = this._params.resolution;
    const resolutionPlusOne = resolution + 1;
    
    // TODO: could we also set position just once here as well?

    // init uv's
    // NOTE: could probably flip y in these UVs instead of in every shader
    const uvs = new Float32Array(resolutionPlusOne * resolutionPlusOne * 2);
    for (let x = 0; x < resolutionPlusOne; x++) {
      for (let y = 0; y < resolutionPlusOne; y++) {
        const outputIndex = (resolutionPlusOne * x + y) * 2;
        uvs[outputIndex + 0] = x / resolution;
        uvs[outputIndex + 1] = y / resolution;
      }
    }

    // init indices
    const indices = new Uint32Array(resolution * resolution * 3 * 2);
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const outputIndex = (resolution * i + j) * 6;
        indices[outputIndex + 0] = i * (resolution + 1) + j;
        indices[outputIndex + 1] = (i + 1) * (resolution + 1) + j + 1;
        indices[outputIndex + 2] = i * (resolution + 1) + j + 1;
        indices[outputIndex + 3] = (i + 1) * (resolution + 1) + j;
        indices[outputIndex + 4] = (i + 1) * (resolution + 1) + j + 1;
        indices[outputIndex + 5] = i * (resolution + 1) + j;
      }
    }

    // update geometry
    this._geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    this._geometry.setIndex(new BufferAttribute(indices, 1));
    this._geometry.attributes.uv.needsUpdate = true;
  }

  updateGeometry(data) {
    if (!data) return;

    // update positions
    this._geometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    this._geometry.attributes.position.needsUpdate = true;
    // since normals are just "normal" before map, use positions (faster than computeVertexNormals)
    this._geometry.setAttribute('normal', new Float32BufferAttribute(data.positions, 3));
    this._geometry.attributes.normal.needsUpdate = true;

    // debug (if debugging)
    if (false && first) {
      const debug = 'normalBitmap';
      first = false;
      const canvas = document.getElementById('test_canvas');
      if (!!canvas) {
        canvas.style.height = `${data[debug].height}px`;
        canvas.style.width = `${data[debug].width}px`;
        canvas.style.zoom = 300 / CHUNK_RESOLUTION;
        const ctx = canvas.getContext('bitmaprenderer');
        ctx.transferFromImageBitmap(data[debug]);
      } else {
        console.log('#test_canvas not found!');
      }

    // update material
    } else {
      // (dispose of all previous material maps)
      if (this._material.displacementMap) this._material.displacementMap.dispose();
      if (this._material.map) this._material.map.dispose();
      if (this._material.normalMap) this._material.normalMap.dispose();

      // (set new values)
      // NOTE: the ternaries below are b/c there is different format for data generated
      //  on offscreen canvas vs normal canvas (i.e. if offscreencanvas not supported)
      this._material.setValues({
        displacementMap: data.heightBitmap.image ? data.heightBitmap: new CanvasTexture(data.heightBitmap),
        map: data.colorBitmap.image ? data.colorBitmap: new CanvasTexture(data.colorBitmap),
        normalMap: data.normalBitmap.image ? data.normalBitmap: new CanvasTexture(data.normalBitmap),
      });
      this._material.needsUpdate = true;
    }
  }
}

export default TerrainChunk;