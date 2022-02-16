import {
  CanvasTexture,
  ImageBitmapLoader,
  LinearFilter,
  LinearMipMapLinearFilter,
  NearestFilter,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import colorShader from '~/game/scene/asteroid/color.glsl';
import heightShader from '~/game/scene/asteroid/height.glsl';
import heightShaderWithStitching from '~/game/scene/asteroid/height_w_stitching.glsl';
import normalShader from '~/game/scene/asteroid/normal.glsl';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

const rampsPath = `${process.env.PUBLIC_URL}/textures/asteroid/ramps.png`;

// set up texture renderer (ideally w/ offscreen canvas)
const textureRenderer = new TextureRenderer();

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

export function generateHeightMap(cubeTransform, chunkSize, chunkOffset, chunkResolution, edgeStrides, config, returnType = 'bitmap') {
  const material = new ShaderMaterial({
    fragmentShader: (edgeStrides.N === 1 && edgeStrides.S === 1 && edgeStrides.E === 1 && edgeStrides.W === 1)
      ? heightShader
      : heightShaderWithStitching,
    uniforms: {
      uChunkOffset: { type: 'v2', value: chunkOffset },
      uChunkSize: { type: 'f', value: chunkSize },
      uCleaveCut: { type: 'f', value: config.cleaveCut },
      uCleaveWeight: { type: 'f', value: config.cleaveWeight },
      uCraterCut: { type: 'f', value: config.craterCut },
      uCraterFalloff: { type: 'f', value: config.craterFalloff },
      uCraterPasses: { type: 'i', value: config.craterPasses },
      uCraterPersist: { type: 'f', value: config.craterPersist },
      uCraterSteep: { type: 'f', value: config.craterSteep },
      uDispFreq: { type: 'f', value: config.dispFreq },
      uDispPasses: { type: 'i', value: config.dispPasses },
      uDispPersist: { type: 'f', value: config.dispPersist },
      uDispWeight: { type: 'f', value: config.dispWeight },
      uEdgeStrideN: { type: 'f', value: edgeStrides.N },
      uEdgeStrideS: { type: 'f', value: edgeStrides.S },
      uEdgeStrideE: { type: 'f', value: edgeStrides.E },
      uEdgeStrideW: { type: 'f', value: edgeStrides.W },
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

  if (returnType === 'texture') {
    const texture = textureRenderer.render(chunkResolution, chunkResolution, material);
    texture.options = {
      generateMipmaps: true,
      minFilter: LinearMipMapLinearFilter,
      magFilter: LinearFilter,
      needsUpdate: true
    };
    return texture;
  }
  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);
}

function generateColorMap(heightMap, chunkResolution, edgeStrides, config) {
  if (!ramps) throw new Error('Ramps not yet loaded!');

  const material = new ShaderMaterial({
    fragmentShader: colorShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      tRamps: { type: 't', value: ramps },
      uSpectral: { type: 'f', value: config.spectralType },
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) },

      // TODO: remove
      uEdgeStrideN: { type: 'f', value: edgeStrides.N },
      uEdgeStrideS: { type: 'f', value: edgeStrides.S },
      uEdgeStrideE: { type: 'f', value: edgeStrides.E },
      uEdgeStrideW: { type: 'f', value: edgeStrides.W },
    }
  });

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

  return textureRenderer.renderBitmap(chunkResolution, chunkResolution, material);
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

export function rebuildChunkGeometry({ config, groupMatrix, offset, heightScale, edgeStrides, resolution, width }) {
  if (!ramps) return;
  benchmark();

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

  benchmark('setup');

  const heightBitmap = generateHeightMap(
    localToWorld,
    chunkSize,
    chunkOffset,
    resolutionPlusOne,
    edgeStrides,
    config
  );
  benchmark('height bitmap');
  const heightTexture = heightBitmap.image ? heightBitmap : new CanvasTexture(heightBitmap);
  benchmark('height texture');

  const colorBitmap = generateColorMap(
    heightTexture,
    resolutionPlusOne,
    edgeStrides,
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
  heightTexture.dispose();
  benchmark('dispose');

  // build geometry
  const _P = new Vector3();
  const _S = new Vector3();
  const bufferTally = resolutionPlusOne * resolutionPlusOne * 3;
  const positions = new Float32Array(bufferTally);
  const scaledHeight = config.radius * heightScale;
  for (let x = 0; x < resolutionPlusOne; x++) {
    const xp = width * x / resolution - half;
    for (let y = 0; y < resolutionPlusOne; y++) {
      const yp = width * y / resolution - half;
      let midStride = false;

      // handle stitching on EW
      if ((x === resolution && edgeStrides.E > 1) || (x === 0 && edgeStrides.W > 1)) {
        const stride = Math.max(edgeStrides.E, edgeStrides.W);
        const strideMod = y % stride;
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          _P.set(
            xp,
            width * Math.floor(y / stride) * stride / resolution - half,
            config.radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight);

          _S.set(
            xp,
            width * Math.ceil(y / stride) * stride / resolution - half,
            config.radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight);

          _P.lerp(_S, strideMod / stride);
        }

      // handle stitching on NS
      } else if ((y === resolution && edgeStrides.N > 1) || (y === 0 && edgeStrides.S > 1)) {
        const stride = Math.max(edgeStrides.N, edgeStrides.S);
        const strideMod = x % stride;
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          _P.set(
            width * Math.floor(x / stride) * stride / resolution - half,
            yp,
            config.radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight);

          _S.set(
            width * Math.ceil(x / stride) * stride / resolution - half,
            yp,
            config.radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight);

          _P.lerp(_S, strideMod / stride);
        }
      }
      
      // handle all other points
      if (!midStride) {
        _P.set(xp, yp, config.radius);
        _P.add(offset);
        _P.setLength(scaledHeight);
      }

      const outputIndex = 3 * (resolutionPlusOne * x + y);
      positions[outputIndex + 0] = _P.x;
      positions[outputIndex + 1] = _P.y;
      positions[outputIndex + 2] = _P.z;
    }
  }
  
  benchmark('_');

  return {
    positions,
    colorBitmap,
    heightBitmap,
    normalBitmap
  };
}
