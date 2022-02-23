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
      uDispFineWeight: { type: 'f', value: 0.08 },
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

function generateColorMap(heightMap, chunkResolution, config, { edgeStrides, chunkSize }, returnType = 'bitmap') {
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
      uChunkSize: { type: 'f', value: chunkSize },
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

export function rebuildChunkGeometry({ config, groupMatrix, offset, heightScale, edgeStrides, resolution, width, oversample }) {
  if (!ramps) return;
  benchmark();

  const localToWorld = groupMatrix;
  const resolutionPlusOne = resolution + 1;
  const half = width / 2;
  const chunkSize = width / (2 * config.radius);
  const chunkOffset = offset.clone().multiplyScalar(1 / config.radius);

  const textureResolution = oversample ? resolutionPlusOne + 2 : resolutionPlusOne;
  const textureSize = oversample ? chunkSize * (1 + 2 / resolution) : chunkSize;

  // TODO: remove debug
  // let debug = false;
  // if (chunkOffset.x === -0.25 && chunkOffset.y === -0.25) {
  //   debug = '-0.25,-0.25';
  // } else if (chunkOffset.x === 0.25 && chunkOffset.y === -0.25) {
  //   debug = '0.25,-0.25';
  // }

  // meant to match normal intensity of dynamic resolution asteroids to legacy
  // fixed resolution asteroids (height difference between neighbor samples is
  // used to calculate normal, but now that width is variable b/w samples, so
  // need to accomodate that dynamicism for consistent "slope")
  //  NOTE: this targets legacy user settings for resolution-of-512-textures, which
  //        was consistent across all asteroid sizes... 
  //  TODO (enhancement): could also standardize betweeen asteroids, but that's different
  //        than legacy
  const normalCompatibilityScale = textureResolution / (512 * textureSize);

  // if (debug) {
  //   const debugTexture = generateHeightMap(
  //     localToWorld,
  //     textureSize,
  //     chunkOffset,
  //     textureResolution,
  //     edgeStrides,
  //     oversample,
  //     config,
  //     'texture'
  //   );
  //   const txt = [debug];
  //   for (let y = 0; y < textureResolution; y++) {
  //     const row = [];
  //     for (let x = 0; x < textureResolution; x++) {
  //       const bi = 4 * (textureResolution * y + x);
  //       row.push(`[${x},${y}] ` + [
  //         debugTexture.buffer[bi],
  //         debugTexture.buffer[bi+1],
  //         debugTexture.buffer[bi+2],
  //         debugTexture.buffer[bi+3],
  //       ].join(','));
  //     }
  //     txt.push(row.join('\t'));
  //   }
  //   console.log(txt.join('\n'));
  // }

  benchmark('setup');

  const heightBitmap = generateHeightMap(
    localToWorld,
    textureSize,
    chunkOffset,
    textureResolution,
    edgeStrides,
    oversample,
    config
  );

  benchmark('height bitmap');
  const heightTexture = heightBitmap.image ? heightBitmap : new CanvasTexture(heightBitmap);
  benchmark('height texture');

  const colorBitmap = generateColorMap(
    heightTexture,
    textureResolution,
    config,
    { edgeStrides, chunkSize }
  );
  benchmark('color');

  const normalBitmap = generateNormalMap(
    heightTexture,
    textureResolution,
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
  const positions = new Float32Array(resolutionPlusOne * resolutionPlusOne * 3);
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
        // if (debug) console.log(`${debug}: ${x},${y}: x-edge ${strideMod}/${stride}`);
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          // * "+ 1" to avoid seams from rounding differences and z-fighting
          _P.set(
            xp,
            width * Math.floor(y / stride) * stride / resolution - half,
            config.radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight + 1); // *

          _S.set(
            xp,
            width * Math.ceil(y / stride) * stride / resolution - half,
            config.radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight + 1); // *

          _P.lerp(_S, strideMod / stride);
        }

      // handle stitching on NS
      } else if ((y === resolution && edgeStrides.N > 1) || (y === 0 && edgeStrides.S > 1)) {
        const stride = Math.max(edgeStrides.N, edgeStrides.S);
        const strideMod = x % stride;
        // if (debug) console.log(`${debug}: ${x},${y}: y-edge ${strideMod}/${stride}`);
        if (strideMod > 0) {
          midStride = true;

          // set _P to stride-start point, set _S to stride-end point, then lerp between
          _P.set(
            width * Math.floor(x / stride) * stride / resolution - half,
            yp,
            config.radius
          );
          _P.add(offset);
          _P.setLength(scaledHeight + 1); // *

          _S.set(
            width * Math.ceil(x / stride) * stride / resolution - half,
            yp,
            config.radius
          );
          _S.add(offset);
          _S.setLength(scaledHeight + 1); // *

          _P.lerp(_S, strideMod / stride);
        }
      }
      
      // handle all other points
      if (!midStride) {
        // if (debug) console.log(`${debug}: ${x},${y}: no stride`);
        _P.set(xp, yp, config.radius);
        _P.add(offset);
        _P.setLength(scaledHeight);
        // if (debug === `-0.125,-0.375` && x === 4 && y === 2) console.log('scaled', _P.clone());
        // if (debug === `0.25,-0.25` && x === 0 && y === 3) console.log('scaled', _P.clone());
      }

      // if (debug === '-0.125,-0.375' && x === resolution) {
      //   console.log(debug, y, _P.clone());
      // }
      // if (debug === '0.25,-0.25' && x === 0) {
      //   console.log(debug, y, _P.clone());
      // }

      // init uv's
      // NOTE: could probably flip y in these UVs instead of in every shader
      // const uvs = new Float32Array(resolutionPlusOne * resolutionPlusOne * 2);
      // for (let x = 0; x < resolutionPlusOne; x++) {
      //   for (let y = 0; y < resolutionPlusOne; y++) {
      //     const outputIndex = (resolutionPlusOne * x + y) * 2;
      //     uvs[outputIndex + 0] = x / resolution;
      //     uvs[outputIndex + 1] = y / resolution;
      //   }
      // }

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
