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
import rampsDataUri from '~/game/scene/asteroid/ramps.png.datauri';
import constants from '~/lib/constants';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

const { OVERSAMPLE_CHUNK_TEXTURES } = constants;

// set up texture renderer (ideally w/ offscreen canvas)
const textureRenderer = new TextureRenderer();

// TODO: remove this debug vvv
let first = true;
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
// setInterval(() => {
//   if (first) {
//     first = false;
//     totals = {};
//     totalRuns = 0;
//     return;
//   }

//   const b = {};
//   let prevTime = 0;
//   Object.keys(totals).forEach((k) => {
//     const thisTime = Math.round(totals[k] / totalRuns);
//     if (k === '_') {
//       b['TOTAL'] = thisTime;
//     } else {
//       b[k] = thisTime - prevTime;
//       prevTime = thisTime;
//     }
//   });
//   console.log(`b ${totalRuns}`, b);
// }, 5000);
// ^^^


// load ramps
let ramps;
export async function initChunkTextures() {
  if (!ramps) {
    let loader;
    try {
      loader = new TextureLoader();
      ramps = await loader.loadAsync(rampsDataUri);
    } catch (e) {
      loader = new ImageBitmapLoader();
      ramps = new CanvasTexture(await loader.loadAsync(rampsDataUri));
    }
    ramps.minFilter = NearestFilter;
    ramps.magFilter = NearestFilter;
  }
}

export function generateHeightMap(cubeTransform, chunkSize, chunkOffset, chunkResolution, edgeStrides, oversample, config, returnType = 'bitmap') {
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
      uDispFineWeight: { type: 'f', value: 0.075 },
      uEdgeStrideN: { type: 'f', value: edgeStrides.N },
      uEdgeStrideS: { type: 'f', value: edgeStrides.S },
      uEdgeStrideE: { type: 'f', value: edgeStrides.E },
      uEdgeStrideW: { type: 'f', value: edgeStrides.W },
      uFeaturesFreq: { type: 'f', value: config.featuresFreq },
      uOversample: { type: 'f', value: oversample ? 1.0 : 0.0 },
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

function generateColorMap(heightMap, chunkResolution, config, /*{ edgeStrides, chunkSize, side }, */returnType = 'bitmap') {
  if (!ramps) throw new Error('Ramps not yet loaded!');

  const material = new ShaderMaterial({
    fragmentShader: colorShader,
    uniforms: {
      tHeightMap: { type: 't', value: heightMap },
      tRamps: { type: 't', value: ramps },
      uSpectral: { type: 'f', value: config.spectralType },
      uResolution: { type: 'v2', value: new Vector2(chunkResolution, chunkResolution) },

      // TODO: remove
      // uEdgeStrideN: { type: 'f', value: edgeStrides.N },
      // uEdgeStrideS: { type: 'f', value: edgeStrides.S },
      // uEdgeStrideE: { type: 'f', value: edgeStrides.E },
      // uEdgeStrideW: { type: 'f', value: edgeStrides.W },
      // uChunkSize: { type: 'f', value: chunkSize },
      // uSide: { type: 'i', value: side },
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

function generateNormalMap(heightMap, chunkResolution, compatibilityScalar, config, returnType = 'bitmap') {
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

export function rebuildChunkGeometry({ config, edgeStrides, heightScale, offset, resolution, width }) {
  const radius = config.radius;
  const scaledHeight = radius * heightScale;
  const resolutionPlusOne = resolution + 1;
  const half = width / 2;

  const _P = new Vector3();
  const _S = new Vector3();
  const positions = new Float32Array(resolutionPlusOne * resolutionPlusOne * 3);
  for (let x = 0; x < resolutionPlusOne; x++) {
    const xp = width * x / resolution - half;
    for (let y = 0; y < resolutionPlusOne; y++) {
      const yp = width * y / resolution - half;
      
      let midStride = false;
      const strideEW = (x === resolution && edgeStrides.E > 1) ? edgeStrides.E : (
        (x === 0 && edgeStrides.W > 1) ? edgeStrides.W : 1
      );
      const strideNS = (y === resolution && edgeStrides.N > 1) ? edgeStrides.N : (
        (y === 0 && edgeStrides.S > 1) ? edgeStrides.S : 1
      );

      // handle stitching on EW
      if (strideEW > 1) {
        const stride = strideEW;
        const strideMod = y % stride;
        // if (debug) console.log(`${debug}: ${x},${y}: x-edge ${strideMod}/${stride}`);
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          // * "+ 1" to avoid seams from rounding differences and z-fighting
          const strideMult = width * stride / resolution;
          _P.set(
            xp,
            Math.floor(y / stride) * strideMult - half,
            radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight + 1); // *

          _S.set(
            xp,
            Math.ceil(y / stride) * strideMult - half,
            radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight + 1); // *

          _P.lerp(_S, strideMod / stride);
        }
      } else if (strideNS > 1) {
        const stride = strideNS;
        const strideMod = x % stride;
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          const strideMult = width * stride / resolution;
          _P.set(
            Math.floor(x / stride) * strideMult - half,
            yp,
            radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight + 1); // *

          _S.set(
            Math.ceil(x / stride) * strideMult - half,
            yp,
            radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight + 1); // *

          _P.lerp(_S, strideMod / stride);
        }
      }
      
      // handle all other points
      if (!midStride) {
        _P.set(xp, yp, radius);
        _P.add(offset);
        _P.setLength(scaledHeight);
      }

      const outputIndex = 3 * (resolutionPlusOne * x + y);
      positions[outputIndex + 0] = _P.x;
      positions[outputIndex + 1] = _P.y;
      positions[outputIndex + 2] = _P.z;
    }
  }

  return positions;
}

export function rebuildChunkMaps({ config, edgeStrides, groupMatrix, offset, resolution, width }) {
  const localToWorld = groupMatrix;
  const chunkSize = width / (2 * config.radius);
  const chunkOffset = offset.clone().multiplyScalar(1 / config.radius);

  const resolutionPlusOne = resolution + 1;
  const textureResolution = OVERSAMPLE_CHUNK_TEXTURES ? resolutionPlusOne + 2 : resolutionPlusOne;
  const textureSize = OVERSAMPLE_CHUNK_TEXTURES ? chunkSize * (1 + 2 / resolution) : chunkSize;

  // meant to match normal intensity of dynamic resolution asteroids to legacy
  // fixed resolution asteroids (height difference between neighbor samples is
  // used to calculate normal, but now that width is variable b/w samples, so
  // need to accomodate that dynamicism for consistent "slope")
  //  NOTE: this targets legacy user settings for resolution-of-512-textures, which
  //        was consistent across all asteroid sizes... 
  //  TODO (enhancement): could also standardize betweeen asteroids, but that's different
  //        than legacy
  const normalCompatibilityScale = textureResolution / (512 * textureSize);

  const heightBitmap = generateHeightMap(
    localToWorld,
    textureSize,
    chunkOffset,
    textureResolution,
    edgeStrides,
    OVERSAMPLE_CHUNK_TEXTURES,
    config
  );
  const heightTexture = heightBitmap.image ? heightBitmap : new CanvasTexture(heightBitmap);

  // (both color and normal maps are built from height map data, so do not need to separately
  //  stitch color and normal maps since they are built from the stitched height map values)
  const colorBitmap = generateColorMap(
    heightTexture,
    textureResolution,
    config,
  );

  const normalBitmap = generateNormalMap(
    heightTexture,
    textureResolution,
    normalCompatibilityScale,
    config
  );

  // done with interim data textures
  heightTexture.dispose();
  
  return {
    heightBitmap,
    colorBitmap,
    normalBitmap
  };
}
