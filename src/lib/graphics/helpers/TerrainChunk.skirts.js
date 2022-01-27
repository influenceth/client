import * as THREE from 'three';
import TextureRenderer from '../TextureRenderer';
import colorShader from '../../../scene/asteroid/color.new.glsl';
import displacementShader from '../../../scene/asteroid/displacement.glsl';
import heightShader from '../../../scene/asteroid/height.new.glsl';
import normalShader from '../../../scene/asteroid/normal.new.glsl';

const textureRenderer = new TextureRenderer(
  new THREE.WebGLRenderer({
    canvas: new OffscreenCanvas(0, 0),
    antialias: true
  })
);

const rampsPath = `${process.env.PUBLIC_URL}/textures/asteroid/ramps.png`;
let ramps;
let loader;
try {
  loader = new THREE.TextureLoader();
  ramps = loader.load(rampsPath);
} catch (e) {
  loader = new THREE.ImageBitmapLoader();
  ramps = new THREE.CanvasTexture(loader.load(rampsPath));
}
ramps.minFilter = THREE.NearestFilter;
ramps.magFilter = THREE.NearestFilter;

function generateDisplacementMap(cubeTransform, chunkSize, chunkOffset, chunkResolution, config) {
  const material = new THREE.ShaderMaterial({
    fragmentShader: displacementShader,
    uniforms: {
      uChunkOffset: { type: 'v2', value: chunkOffset },
      uChunkSize: { type: 'f', value: chunkSize },
      uDispFreq: { type: 'f', value: config.dispFreq },
      uDispPasses: { type: 'i', value: config.dispPasses },
      uDispPersist: { type: 'f', value: config.dispPersist },
      uDispWeight: { type: 'f', value: config.dispWeight },
      uResolution: { type: 'v2', value: new THREE.Vector2(chunkResolution, chunkResolution) },
      uSeed: { type: 'v3', value: config.seed },
      uTransform: { type: 'mat4', value: cubeTransform },
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    flipY: true,
    generateMipmaps: true,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateHeightMap(displacementMap, cubeTransform, chunkSize, chunkOffset, chunkResolution, config) {
  const material = new THREE.ShaderMaterial({
    fragmentShader: heightShader,
    uniforms: {
      tDisplacementMap: { type: 't', value: displacementMap },
      uChunkOffset: { type: 'v2', value: chunkOffset },
      uChunkSize: { type: 'f', value: chunkSize },
      uCleaveCut: { type: 'f', value: config.cleaveCut },
      uCleaveWeight: { type: 'f', value: config.cleaveWeight },
      uCraterCut: { type: 'f', value: config.craterCut },
      uCraterFalloff: { type: 'f', value: config.craterFalloff },
      uCraterPasses: { type: 'i', value: config.craterPasses },
      uCraterPersist: { type: 'f', value: config.craterPersist },
      uCraterSteep: { type: 'f', value: config.craterSteep },
      uDispWeight: { type: 'f', value: config.dispWeight },
      uFeaturesFreq: { type: 'f', value: config.featuresFreq },
      uResolution: { type: 'v2', value: new THREE.Vector2(chunkResolution, chunkResolution) },
      uRimVariation: { type: 'f', value: config.rimVariation },
      uRimWeight: { type: 'f', value: config.rimWeight },
      uRimWidth: { type: 'f', value: config.rimWidth },
      uSeed: { type: 'v3', value: config.seed },
      uStretch: { type: 'v3', value: config.stretch },
      uTopoDetail: { type: 'i', value: config.topoDetail },
      uTopoFreq: { type: 'f', value: config.topoFreq },
      uTopoWeight: { type: 'f', value: config.topoWeight },
      uTransform: { type: 'mat4', value: cubeTransform },
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    flipY: true,
    generateMipmaps: true,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateColorMap(heightMap, chunkResolution, config) {
  const material = new THREE.ShaderMaterial({
    fragmentShader: colorShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      tRamps: { type: 't', value: ramps },
      uSpectral: { type: 'f', value: config.spectralType },
      uResolution: { type: 'v2', value: new THREE.Vector2(chunkResolution, chunkResolution) }
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    generateMipmaps: true,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateNormalMap(heightMap, chunkResolution, config) {
  const material = new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    fragmentShader: normalShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      uNormalIntensity: { type: 'f', value: config.normalIntensity },
      uResolution: { type: 'v2', value: new THREE.Vector2(chunkResolution, chunkResolution) }
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    generateMipmaps: true,
    minFilter: THREE.LinearMipMapLinearFilter,
    magFilter: THREE.LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function mapToDataTexture(map) {
  return new THREE.DataTexture(
    map.buffer,
    map.width,
    map.height,
    map.format
  );
}

class TerrainChunk {
  constructor(params, config, textureRenderer) {
    this._params = params;
    this._config = config;
    this._textureRenderer = textureRenderer;
    
    this._geometry = new THREE.BufferGeometry();
    this._plane = new THREE.Mesh(this._geometry, params.material);
    this._plane.castShadow = false;
    this._plane.receiveShadow = true;
    this._params.group.add(this._plane);
  }
  
  destroy() {
    this._params.group.remove(this._plane);
  }

  hide() {
    this._plane.visible = false;
  }

  show() {
    this._plane.visible = true;
  }
  rebuild() {
    const _D = new THREE.Vector3();
    const _P = new THREE.Vector3();
    const _N = new THREE.Vector3();

    const positions = [];
    const colors = [];
    const normals = [];
    const indices = [];

    const localToWorld = this._params.group.matrix.clone();
    const resolution = this._params.resolution;
    const resolutionPlusOne = this._params.resolution + 1;
    const radius = this._params.radius;
    const offset = this._params.offset.clone();
    const width = this._params.width;
    const half = width / 2;

    const chunkSize = width / (2 * radius);
    const chunkOffset = this._params.offset.clone().multiplyScalar(1 / radius);
    
    // TODO: resolution
    // attempt to scale normal intensity to previous fixed-resolution intensity
    const normalScale = Math.max(1, (width / resolution) / (0.0025 * radius));

    const displacementMap = generateDisplacementMap(
      localToWorld,
      chunkSize,
      chunkOffset,
      resolutionPlusOne,
      this._config
    );

    const heightMap = generateHeightMap(
      mapToDataTexture(displacementMap),
      localToWorld,
      chunkSize,
      chunkOffset,
      resolutionPlusOne,
      this._config
    );
    const heightMapDataTexture = mapToDataTexture(heightMap);

    // TODO: colorshader texture could be passed directly into attribute (after mapping from 4 to 3 values)
    const colorMap = generateColorMap(
      heightMapDataTexture,
      resolutionPlusOne,
      this._config
    );

    const normalMap = generateNormalMap(
      heightMapDataTexture,
      resolutionPlusOne,
      this._config
    );

    for (let x = 0; x < resolutionPlusOne; x++) {
      const xp = width * x / resolution;
      for (let y = 0; y < resolutionPlusOne; y++) {
        const yp = width * y / resolution;

        const bufferIndex = resolutionPlusOne * y + x;
    
    // TODO: skirts
    // const resolutionPlusTwo = resolution + 2;
    // for (let x = -1; x < resolutionPlusTwo; x++) {
    //   const useX = Math.max(0, Math.min(x, resolution));
    //   const xp = width * useX / resolution;
    //   for (let y = -1; y < resolutionPlusTwo; y++) {
    //     const useY = Math.max(0, Math.min(y, resolution));
    //     const yp = width * useY / resolution;

    //     const bufferIndex = resolutionPlusOne * useY + useX;

        // compute position and direction
        _P.set(xp - half, yp - half, radius);
        _P.add(offset);
        _P.normalize();
        _D.copy(_P);

        // displace the position
        const displacement = -1 + (
          displacementMap.buffer[bufferIndex * 4 + 0]
          + displacementMap.buffer[bufferIndex * 4 + 1] / 255.0 // TODO: should this be 256?
        ) / 128.0;
        _P.setLength(radius * (1 + displacement * this._config.dispWeight));

        // apply stretch deformation
        // TODO (enhancement): there is probably some way to use matrix to apply these
        if ([0,1].includes(this._params.side)) {
          _P.x *= this._config.stretch.x;
          _P.y *= this._config.stretch.z;
          _P.z *= this._config.stretch.y;
        } else if ([2,3].includes(this._params.side)) {
          _P.x *= this._config.stretch.z;
          _P.y *= this._config.stretch.y;
          _P.z *= this._config.stretch.x;
        } else {
          _P.x *= this._config.stretch.x;
          _P.y *= this._config.stretch.y;
          _P.z *= this._config.stretch.z;
        }

        // TODO: skirts
        // if (x !== useX || y !== useY) {
        //   _P.setLength(_P.length() * 0.95);
        // }
        positions.push(_P.x, _P.y, _P.z);

        // colors
        const color = new THREE.Color(
          colorMap.buffer[bufferIndex * 4] / 256.0,
          colorMap.buffer[bufferIndex * 4 + 1] / 256.0,
          colorMap.buffer[bufferIndex * 4 + 2] / 256.0
        );
        colors.push(color.r, color.g, color.b);

        // normals
        const nx = normalMap.buffer[bufferIndex * 4] / 128 - 1;
        const ny = normalMap.buffer[bufferIndex * 4 + 1] / 128 - 1;
        _N.x = _D.x + nx / normalScale;
        _N.y = _D.y + ny / normalScale;
        _N.z = _D.z;
        _N.normalize();
        normals.push(_N.x, _N.y, _N.z);
      }
    }

    // index points
    const useResolution = resolution;
    // TODO: skirts 
    // const useResolution = resolutionPlusTwo;
    for (let i = 0; i < useResolution; i++) {
      for (let j = 0; j < useResolution; j++) {
        indices.push(
            i * (useResolution + 1) + j,
            (i + 1) * (useResolution + 1) + j + 1,
            i * (useResolution + 1) + j + 1);
        indices.push(
            (i + 1) * (useResolution + 1) + j,
            (i + 1) * (useResolution + 1) + j + 1,
            i * (useResolution + 1) + j);
      }
    }

    // set attributes
    this._geometry.setAttribute(
        'position', new THREE.Float32BufferAttribute(positions, 3));
    this._geometry.setAttribute(
        'color', new THREE.Float32BufferAttribute(colors, 3));
    this._geometry.setAttribute(
        'normal', new THREE.Float32BufferAttribute(normals, 3));
    this._geometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(indices), 1));
  }
}

export default TerrainChunk;