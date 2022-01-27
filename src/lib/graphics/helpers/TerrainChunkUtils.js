import {
  CanvasTexture,
  Color,
  DataTexture,
  LinearFilter,
  LinearMipMapLinearFilter,
  ImageBitmapLoader,
  NearestFilter,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import colorShader from '~/game/scene/asteroid/color.glsl';
import displacementShader from '~/game/scene/asteroid/displacement.glsl';
import heightShader from '~/game/scene/asteroid/height.glsl';
import normalShader from '~/game/scene/asteroid/normal.glsl';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

const rampsPath = `${process.env.PUBLIC_URL}/textures/asteroid/ramps.png`;

// // TODO: this was in Asteroid (for no-offscreen-worker)
// const textureRenderer = typeof OffscreenCanvas === 'undefined' && new TextureRenderer();

// // TODO: this was in worker
// // Setup offscreen canvas
// if (typeof OffscreenCanvas !== 'undefined') {
//   const offscreen = new OffscreenCanvas(0, 0);
//   const renderer = new WebGLRenderer({ canvas: offscreen, antialias: true });
//   textureRenderer = new TextureRenderer(renderer);
// }

// TODO: offscreen canvas?
const textureRenderer = new TextureRenderer(
  new WebGLRenderer({
    canvas: new OffscreenCanvas(0, 0),
    antialias: true
  })
);

// load ramps
let ramps;
export async function initChunkTextures() {
  if (!ramps) {
    let loader;
    try {
      loader = new TextureLoader();
      ramps = await loader.loadAsync(rampsPath);
    } catch (e) {
      loader = new ImageBitmapLoader();
      ramps = new CanvasTexture(await loader.loadAsync(rampsPath));
    }
    ramps.minFilter = NearestFilter;
    ramps.magFilter = NearestFilter;
  }
}

function generateDisplacementMap(cubeTransform, chunkSize, chunkOffset, chunkResolution, config) {
  const material = new ShaderMaterial({
    fragmentShader: displacementShader,
    uniforms: {
      uChunkOffset: { type: 'v2', value: chunkOffset },
      uChunkSize: { type: 'f', value: chunkSize },
      uDispFreq: { type: 'f', value: config.dispFreq },
      uDispPasses: { type: 'i', value: config.dispPasses },
      uDispPersist: { type: 'f', value: config.dispPersist },
      uDispWeight: { type: 'f', value: config.dispWeight },
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) },
      uSeed: { type: 'v3', value: config.seed },
      uTransform: { type: 'mat4', value: cubeTransform },
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    flipY: true,
    generateMipmaps: true,
    minFilter: LinearMipMapLinearFilter,
    magFilter: LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateHeightMap(displacementMap, cubeTransform, chunkSize, chunkOffset, chunkResolution, config) {
  const material = new ShaderMaterial({
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
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) },
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
    minFilter: LinearMipMapLinearFilter,
    magFilter: LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateColorMap(heightMap, chunkResolution, config) {
  if (!ramps) throw new Error('Ramps not yet loaded!');

  const material = new ShaderMaterial({
    fragmentShader: colorShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      tRamps: { type: 't', value: ramps },
      uSpectral: { type: 'f', value: config.spectralType },
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) }
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    generateMipmaps: true,
    minFilter: LinearMipMapLinearFilter,
    magFilter: LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function generateNormalMap(heightMap, chunkResolution, compatibilityScalar, config) {
  const material = new ShaderMaterial({
    extensions: { derivatives: true },
    fragmentShader: normalShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      uCompatibilityScalar: { type: 'f', value: compatibilityScalar },
      uNormalIntensity: { type: 'f', value: config.normalIntensity },
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) }
    }
  });

  const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  texture.options = {
    generateMipmaps: true,
    minFilter: LinearMipMapLinearFilter,
    magFilter: LinearFilter,
    needsUpdate: true
  };

  return texture;
}

function mapToDataTexture(map) {
  return new DataTexture(
    map.buffer,
    map.width,
    map.height,
    map.format
  );
}

export function rebuildChunkGeometry({ config, groupMatrix, offset, radius, resolution, side, width }) {
  if (!ramps) return;

  const _D = new Vector3();
  const _P = new Vector3();
  const _N = new Vector3();

  const positions = [];
  const colors = [];
  const normals = [];
  const indices = [];

  const localToWorld = groupMatrix;
  const resolutionPlusOne = resolution + 1;
  const half = width / 2;
  const chunkSize = width / (2 * radius);
  const chunkOffset = offset.clone().multiplyScalar(1 / radius);

  // meant to help match normal intensity on dynamic resolution asteroids
  // to previously fixed resolution asteroids (height difference between
  // neighbor samples is used to calculate normal, but now that width is
  // dynamic between those samples, need to accomodate for consistent "slope")
  const normalCompatibilityScale = (0.0025 * radius * resolution) / width;

  const displacementMap = generateDisplacementMap(
    localToWorld,
    chunkSize,
    chunkOffset,
    resolutionPlusOne,
    config
  );
  const displacementMapDataTexture = mapToDataTexture(displacementMap);

  const heightMap = generateHeightMap(
    displacementMapDataTexture,
    localToWorld,
    chunkSize,
    chunkOffset,
    resolutionPlusOne,
    config
  );
  const heightMapDataTexture = mapToDataTexture(heightMap);

  const colorMap = generateColorMap(
    heightMapDataTexture,
    resolutionPlusOne,
    config
  );

  const normalMap = generateNormalMap(
    heightMapDataTexture,
    resolutionPlusOne,
    normalCompatibilityScale,
    config
  );

  // done with interim data textures
  displacementMapDataTexture.dispose();
  heightMapDataTexture.dispose();

  // build geometry
  for (let x = 0; x < resolutionPlusOne; x++) {
    const xp = width * x / resolution;
    for (let y = 0; y < resolutionPlusOne; y++) {
      const yp = width * y / resolution;

      const bufferIndex = resolutionPlusOne * y + x;

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
      _P.setLength(radius * (1 + displacement * config.dispWeight));

      // apply stretch deformation
      // TODO (enhancement): there is probably some way to use matrix to apply these
      if ([0,1].includes(side)) {
        _P.x *= config.stretch.x;
        _P.y *= config.stretch.z;
        _P.z *= config.stretch.y;
      } else if ([2,3].includes(side)) {
        _P.x *= config.stretch.z;
        _P.y *= config.stretch.y;
        _P.z *= config.stretch.x;
      } else {
        _P.x *= config.stretch.x;
        _P.y *= config.stretch.y;
        _P.z *= config.stretch.z;
      }
      positions.push(_P.x, _P.y, _P.z);

      // colors
      const color = new Color(
        colorMap.buffer[bufferIndex * 4] / 256.0,
        colorMap.buffer[bufferIndex * 4 + 1] / 256.0,
        colorMap.buffer[bufferIndex * 4 + 2] / 256.0
      );
      colors.push(color.r, color.g, color.b);

      // normals
      const nx = normalMap.buffer[bufferIndex * 4] / 128 - 1;
      const ny = normalMap.buffer[bufferIndex * 4 + 1] / 128 - 1;
      _N.x = _D.x + nx;
      _N.y = _D.y + ny;
      _N.z = _D.z;
      _N.normalize();
      normals.push(_N.x, _N.y, _N.z);
    }
  }

  // index points
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      indices.push(
          i * (resolution + 1) + j,
          (i + 1) * (resolution + 1) + j + 1,
          i * (resolution + 1) + j + 1);
      indices.push(
          (i + 1) * (resolution + 1) + j,
          (i + 1) * (resolution + 1) + j + 1,
          i * (resolution + 1) + j);
    }
  }

  return { positions, colors, normals, indices };
}
