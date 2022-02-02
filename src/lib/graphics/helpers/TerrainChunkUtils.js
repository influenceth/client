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
// import duplicationShader from '~/game/scene/asteroid/duplication.glsl';
import heightShader from '~/game/scene/asteroid/height.glsl';
import normalShader from '~/game/scene/asteroid/normal.glsl';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

const rampsPath = `${process.env.PUBLIC_URL}/textures/asteroid/ramps.png`;

// // TODO: this was in Asteroid (for no-offscreen-worker)
// const textureRenderer = typeof OffscreenCanvas === 'undefined' && new TextureRenderer();

// TODO: this was in worker
// Setup offscreen canvas
let textureRenderer;
if (typeof OffscreenCanvas !== 'undefined') {
  const offscreen = new OffscreenCanvas(0, 0);
  offscreen.style = { width: 0, height: 0 };
  const renderer = new WebGLRenderer({ canvas: offscreen, antialias: true });
  textureRenderer = new TextureRenderer(renderer);
}

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

  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);


  // const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  // texture.options = {
  //   flipY: true,
  //   generateMipmaps: true,
  //   minFilter: LinearMipMapLinearFilter,
  //   magFilter: LinearFilter,
  //   needsUpdate: true
  // };

  // return texture;
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

  // const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  // texture.options = {
  //   flipY: true,
  //   generateMipmaps: true,
  //   minFilter: LinearMipMapLinearFilter,
  //   magFilter: LinearFilter,
  //   needsUpdate: true
  // };
  // return texture;

  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);
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

  // const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  // texture.options = {
  //   generateMipmaps: true,
  //   minFilter: LinearMipMapLinearFilter,
  //   magFilter: LinearFilter,
  //   needsUpdate: true
  // };

  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);
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

  // const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
  // texture.options = {
  //   generateMipmaps: true,
  //   minFilter: LinearMipMapLinearFilter,
  //   magFilter: LinearFilter,
  //   needsUpdate: true
  // };

  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);
}

function mapToDataTexture(map) {
  return new DataTexture(
    map.buffer,
    map.width,
    map.height,
    map.format
  );
}

let totalRuns = 0;
let totals = {};
let startTime;
function benchmark(tag) {
  if (!tag) {
    startTime = Date.now();
    totalRuns++;
  }
  else {
    if (!totals[tag]) totals[tag] = 0;
    totals[tag] += Date.now() - startTime;
  }
}
setInterval(() => {
  const b = {};
  let prevTime = 0;
  Object.keys(totals).forEach((k) => {
    const thisTime = Math.round(totals[k] / totalRuns);
    if (k === '_') {
      b['TOTAL'] = thisTime;
    } else {
      b[k] = thisTime - prevTime;
      prevTime = thisTime;
    }
  });
  // console.log(`b ${totalRuns}`, b);
}, 5000);

export function rebuildChunkGeometry({ config, groupMatrix, offset, resolution, side, width }) {
  if (!ramps) return;
  benchmark();

  const _D = new Vector3();
  const _P = new Vector3();
  const _N = new Vector3();

  const localToWorld = groupMatrix;
  const resolutionPlusOne = resolution + 1;
  const half = width / 2;
  const chunkSize = width / (2 * config.radius);
  const chunkOffset = offset.clone().multiplyScalar(1 / config.radius);

  // meant to help match normal intensity on dynamic resolution asteroids
  // to previously fixed resolution asteroids (height difference between
  // neighbor samples is used to calculate normal, but now that width is
  // dynamic between those samples, need to accomodate for consistent "slope")
  const normalCompatibilityScale = (0.0025 * config.radius * resolution) / width;

  const bufferTally = resolutionPlusOne * resolutionPlusOne * 3;
  const positions = new Float32Array(bufferTally);
  // const colors = new Float32Array(bufferTally);
  // const normals = new Float32Array(bufferTally);
  const uvs = new Float32Array(resolutionPlusOne * resolutionPlusOne * 2);
  const indices = new Uint32Array(resolution * resolution * 3 * 2);

  benchmark('setup');

  const displacementBitmap = generateDisplacementMap(
    localToWorld,
    chunkSize,
    chunkOffset,
    resolutionPlusOne,
    config
  );
  const displacementTexture = new CanvasTexture(displacementBitmap);

  benchmark('displacementmap');

  const heightBitmap = generateHeightMap(
    displacementTexture,
    localToWorld,
    chunkSize,
    chunkOffset,
    resolutionPlusOne,
    config
  );
  benchmark('height bitmap');
  const heightTexture = new CanvasTexture(heightBitmap);
  benchmark('height texture');

  const colorBitmap = generateColorMap(
    heightTexture,
    resolutionPlusOne,
    config
  );
  benchmark('color');

  const normalBitmap = generateNormalMap(
    heightTexture,
    resolutionPlusOne,
    normalCompatibilityScale,
    config
  );
  benchmark('normal');

  // done with interim data textures
  displacementTexture.dispose();
  heightBitmap.close();
  heightTexture.dispose();
  benchmark('dispose');

  // build geometry
  for (let x = 0; x < resolutionPlusOne; x++) {
    const xp = width * x / resolution;
    for (let y = 0; y < resolutionPlusOne; y++) {
      const yp = width * y / resolution;

      const bufferIndex = resolutionPlusOne * y + x;
      const outputIndex = resolutionPlusOne * x + y;

      // compute position and direction
      _P.set(xp - half, yp - half, config.radius);
      _P.add(offset);
      _P.normalize();
      _D.copy(_P);

      // displace the position
      // const displacement = -1 + (
      //   displacementMap.buffer[bufferIndex * 4 + 0]
      //   + displacementMap.buffer[bufferIndex * 4 + 1] / 255.0 // TODO: should this be 256?
      // ) / 128.0;
      // _P.setLength(config.radius * (1 + displacement * config.dispWeight));
      // const displacement = -1 + (
      //   displacementMap.buffer[bufferIndex * 4 + 0]
      //   + displacementMap.buffer[bufferIndex * 4 + 1]
      //   + displacementMap.buffer[bufferIndex * 4 + 2]
      // ) / 384.0;
      // _P.setLength(config.radius * (1 + displacement * config.dispWeight));
      _P.setLength(config.radius);

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
      positions[outputIndex * 3 + 0] = _P.x;
      positions[outputIndex * 3 + 1] = _P.y;
      positions[outputIndex * 3 + 2] = _P.z;

      // uv
      uvs[outputIndex * 2 + 0] = x / resolution;
      uvs[outputIndex * 2 + 1] = y / resolution;
    }
  }
  benchmark('apply');

  // index points
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const outputIndex = resolution * i + j;
      indices[outputIndex * 6 + 0] = i * (resolution + 1) + j;
      indices[outputIndex * 6 + 1] = (i + 1) * (resolution + 1) + j + 1;
      indices[outputIndex * 6 + 2] = i * (resolution + 1) + j + 1;
      indices[outputIndex * 6 + 3] = (i + 1) * (resolution + 1) + j;
      indices[outputIndex * 6 + 4] = (i + 1) * (resolution + 1) + j + 1;
      indices[outputIndex * 6 + 5] = i * (resolution + 1) + j;
    }
  }
  benchmark('_');

  return {
    positions,
    colorBitmap,
    displacementBitmap,
    normalBitmap,
    uvs,
    indices
  };
}
