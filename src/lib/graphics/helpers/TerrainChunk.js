import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  FrontSide,
  LessDepth,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  NearestFilter,
  RGBADepthPacking,
  Vector2,
  Vector3
} from 'three';

import constants from '~/lib/constants';
import { applyDisplacementToGeometry } from './TerrainChunkUtils';

const {
  NORMAL_SCALE,
  NORMAL_SCALE_SHADOWLESS,
  OVERSAMPLE_CHUNK_TEXTURES,
} = constants;

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

const GEO_ATTR_CACHE = {};

class TerrainChunk {
  constructor(params, config, { csmManager, shadowsEnabled, resolution }) {
    this._params = params;
    this._config = config;
    this._csmManager = csmManager;
    this._shadowsEnabled = shadowsEnabled;
    this._resolution = resolution;
    this.updateDerived();

    // init geometry
    this._geometry = new BufferGeometry();
    this.initGeometry();
  
    // init material
    const extraMaterialProps = {};
    if (!shadowsEnabled) {
      // without shadows, asteroids look way more detailed with flat shading... but also looks like all craters are same depth
      // extraMaterialProps.flatShading = true; // TODO: ...
    } else if (csmManager) {
      // extraMaterialProps.shadowSide = DoubleSide;
      extraMaterialProps.alphaTest = 0.5; // TODO: this may not be needed
    } else {
      // extraMaterialProps.shadowSide = DoubleSide;
      extraMaterialProps.alphaTest = 0.5; // TODO: this may not be needed
    }

    this._material = new MeshStandardMaterial({
      color: 0xffffff,
      depthFunc: LessDepth,
      displacementBias: -1 * this._config.radius * this._config.dispWeight,
      displacementScale: 2 * this._config.radius * this._config.dispWeight,
      dithering: true,
      metalness: 0,
      normalScale: shadowsEnabled ? new Vector2(NORMAL_SCALE, NORMAL_SCALE) : new Vector2(NORMAL_SCALE_SHADOWLESS, NORMAL_SCALE_SHADOWLESS),
      roughness: 1,
      side: FrontSide,
      // wireframe: true,
      ...extraMaterialProps
    });

    // apply onBeforeCompile to primary material
    const onBeforeCompile = this.getOnBeforeCompile(
      this._material,
      this._heightScale,
      this._stretch
    );
    if (shadowsEnabled && csmManager) {
      csmManager.setupMaterial(this._material, onBeforeCompile);
    } else {
      this._material.onBeforeCompile = onBeforeCompile;
    }

    // initialize mesh
    this._plane = new Mesh(this._geometry, this._material);

    // add customDepthMaterial (with CSM or not)
    if (shadowsEnabled) {
      this._plane.castShadow = true;
      this._plane.receiveShadow = true;

      // TODO: this looks better without depthPacking, but might be because not visible at all
      
      
      
      this._plane.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
      const onBeforeCompileDepth = this.getOnBeforeCompile(
        this._plane.customDepthMaterial,
        this._heightScale,
        this._stretch,
      );

      if (csmManager) {
        csmManager.setupMaterial(this._plane.customDepthMaterial, onBeforeCompileDepth);
      } else {
        this._plane.customDepthMaterial.onBeforeCompile = onBeforeCompileDepth;
      }
    }
  }

  getOnBeforeCompile(material, heightScale, stretch) {
    return function (shader) {
      shader.uniforms.uHeightScale = { type: 'f', value: heightScale };
      shader.uniforms.uStretch = { type: 'v3', value: stretch };
      shader.vertexShader = `
        uniform float uHeightScale;
        uniform vec3 uStretch;
        ${shader.vertexShader.replace(
          '#include <displacementmap_vertex>',
          `#ifdef USE_DISPLACEMENTMAP
            vec2 disp16 = texture2D(displacementMap, vUv).xy;
            float disp = (disp16.x * 255.0 + disp16.y) / 256.0;
            // stretch back to original geometry (geometry initialized at minHeight for chunk)
            transformed /= uHeightScale;
            // displace along normal
            transformed += normalize( objectNormal ) * (disp * displacementScale + displacementBias);
            // stretch along normal
            transformed *= uStretch;
            // re-init pre-normalmap normal to match position
            // (set post-displacement coarse normals b/f application of normalmap)
            vNormal = normalize( normalMatrix * vec3(transformed.xyz) );
          #endif`
        )}
      `;
      material.userData.shader = shader;
    };
  }

  // it's possible in a race-condition that a chunk is constructed but never rendered...
  // in this case, onBeforeCompile is never run, so material's shader is never set...
  // these chunks are disposed of rather than reused (in theory, could instead reapply
  // onBeforeCompile, etc, but gets a little tricky with CSM setup)
  isReusable() {
    return !!this._material?.userData?.shader
      && (!this._shadowsEnabled || !!this._plane?.customDepthMaterial?.userData?.shader);
  }

  updateDerived() {
    // get heightScale for chunk
    this._heightScale = this._params.minHeight / this._config.radius;

    // transform stretch per side
    if ([0,1].includes(this._params.side)) {
      this._stretch = new Vector3(this._config.stretch.x, this._config.stretch.z, this._config.stretch.y);
    } else if ([2,3].includes(this._params.side)) {
      this._stretch = new Vector3(this._config.stretch.z, this._config.stretch.y, this._config.stretch.x);
    } else {
      this._stretch = this._config.stretch.clone();
    }

    // according to https://threejs.org/docs/#manual/en/introduction/How-to-update-things,
    // uniform values are sent to shader every frame automatically (so no need for needsUpdate)
    if (this._material?.userData?.shader) {
      this._material.userData.shader.uniforms.uHeightScale.value = this._heightScale;
      this._material.userData.shader.uniforms.uStretch.value = this._stretch;
    }
    if (this._plane?.customDepthMaterial?.userData?.shader) {
      this._plane.customDepthMaterial.userData.shader.uniforms.uHeightScale.value = this._heightScale;
      this._plane.customDepthMaterial.userData.shader.uniforms.uStretch.value = this._stretch;
    }
  }

  reconfigure(newParams) {
    this._params = newParams;
    this.updateDerived();
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

  initGeometry() {
    const resolution = this._resolution;
    // using cache since these should be same for every chunk
    if (!GEO_ATTR_CACHE[resolution]) {
      const resolutionPlusOne = resolution + 1;
  
      // init uv's
      // NOTE: could probably flip y in these UVs instead of in every shader
      const uvs = new Float32Array(resolutionPlusOne * resolutionPlusOne * 2);
      for (let x = 0; x < resolutionPlusOne; x++) {
        for (let y = 0; y < resolutionPlusOne; y++) {
          const outputIndex = (resolutionPlusOne * x + y) * 2;
          if (OVERSAMPLE_CHUNK_TEXTURES) {
            uvs[outputIndex + 0] = (x + 1.5) / (resolutionPlusOne + 2);
            uvs[outputIndex + 1] = (y + 1.5) / (resolutionPlusOne + 2);
            // (alternative):
            // uvs[outputIndex + 0] = (x + 1.0) / (resolution + 2);
            // uvs[outputIndex + 1] = (y + 1.0) / (resolution + 2);
          } else {
            uvs[outputIndex + 0] = (x + 0.5) / resolutionPlusOne;
            uvs[outputIndex + 1] = (y + 0.5) / resolutionPlusOne;
            // (alternative):
            // uvs[outputIndex + 0] = x / resolution;
            // uvs[outputIndex + 1] = y / resolution;
          }
        }
      }
    
      // init indices
      const indices = new Uint32Array(resolution * resolution * 3 * 2);
      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const outputIndex = (resolution * i + j) * 6;
          indices[outputIndex + 0] = i * resolutionPlusOne + j;
          indices[outputIndex + 1] = (i + 1) * resolutionPlusOne + j + 1;
          indices[outputIndex + 2] = i * resolutionPlusOne + j + 1;
          indices[outputIndex + 3] = (i + 1) * resolutionPlusOne + j;
          indices[outputIndex + 4] = (i + 1) * resolutionPlusOne + j + 1;
          indices[outputIndex + 5] = i * resolutionPlusOne + j;
        }
      }

      GEO_ATTR_CACHE[resolution] = { uvs, indices };
    }

    // update geometry
    this._geometry.setIndex(new BufferAttribute(GEO_ATTR_CACHE[resolution].indices, 1));
    this._geometry.setAttribute('uv', new Float32BufferAttribute(GEO_ATTR_CACHE[resolution].uvs, 2));
    this._geometry.attributes.uv.needsUpdate = true;
  }

  updateGeometry(positions) {

    // update positions
    this._geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this._geometry.attributes.position.needsUpdate = true;
    
    // since normals are just "normal" before map, use positions (faster than computeVertexNormals)
    this._geometry.setAttribute('normal', new Float32BufferAttribute(positions, 3));
    this._geometry.attributes.normal.needsUpdate = true;

    // if reusing geometry (i.e. by resource pooling), then must re-compute bounding sphere or else
    // chunk will be culled by camera as-if in prior position
    this._geometry.computeBoundingSphere();
  }

  updateMaps(data) {
    // (dispose of all previous material maps)
    if (this._material.displacementMap) this._material.displacementMap.dispose();
    if (this._material.map) this._material.map.dispose();
    if (this._material.normalMap) this._material.normalMap.dispose();

    // (set new values)
    // NOTE: the ternaries below are b/c there is different format for data generated
    //  on offscreen canvas vs normal canvas (i.e. if offscreencanvas not supported)
    this._material.setValues({
      displacementMap: data.heightBitmap.image ? data.heightBitmap : new CanvasTexture(data.heightBitmap, undefined, undefined, undefined, NearestFilter),
      map: data.colorBitmap.image ? data.colorBitmap : new CanvasTexture(data.colorBitmap),
      normalMap: data.normalBitmap.image ? data.normalBitmap : new CanvasTexture(data.normalBitmap)
    });
    this._material.needsUpdate = true;
  }

  makeExportable() {
    applyDisplacementToGeometry(
      this._geometry,
      this._resolution,
      this._config.radius,
      this._material.displacementMap,
      this._material.displacementBias,
      this._material.displacementScale,
      this._stretch
    );

    // compute accurate normals since displacement now in geometry data
    this._geometry.computeVertexNormals();
    this._geometry.attributes.normal.needsUpdate = true;

    // flip color map, remove displacement and normal maps since now in geometry data
    this._material.map.flipY = false;
    this._material.map.needsUpdate = true;
    this._material.setValues({ displacementMap: null, normalMap: null });
    this._material.needsUpdate = true;
  }
}

export default TerrainChunk;