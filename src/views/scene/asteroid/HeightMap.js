import {
  ShaderMaterial,
  Vector2,
  LinearFilter,
  LinearMipMapLinearFilter
} from 'three';
import cubeTransforms from '~/lib/graphics/cubeTransforms';
import heightShader from './height.glsl';

class HeightMap {
  /**
   * @param res Resolution of the map in pixels, should be n^2
   * @param config Asteroid configuration object (from Config.js)
   * @param textureRenderer A reference to the texture renderer (see TextureRenderer)
   */
  constructor(res, config, textureRenderer) {
    this.res = res;
    this.textureRenderer = textureRenderer;
    return this._generateHeightMap(config);
  }

  /**
   * Generates 6 heightmaps (1 per cube side) based on asteroid configuration
   * @param config Asteroid configuration object (from Config.js)
   */
  _generateHeightMap(config) {
    let material;
    const maps = [];

    for (let i = 0; i < 6; i++) {
      material = new ShaderMaterial({
        fragmentShader: heightShader,
        uniforms: {
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
          uFeaturesFreq: { type: 'f', value: config.featuresFreq },
          uResolution: { type: 'v2', value: new Vector2(this.res, this.res) },
          uRimVariation: { type: 'f', value: config.rimVariation },
          uRimWeight: { type: 'f', value: config.rimWeight },
          uRimWidth: { type: 'f', value: config.rimWidth },
          uSeed: { type: 'v3', value: config.seed },
          uStretch: { type: 'v3', value: config.stretch },
          uTopoDetail: { type: 'i', value: config.topoDetail },
          uTopoFreq: { type: 'f', value: config.topoFreq },
          uTopoWeight: { type: 'f', value: config.topoWeight },
          uTransform: { type: 'mat3', value: cubeTransforms[i] }
        }
      });

      const textureArgs = this.textureRenderer.render(this.res, this.res, material);
      textureArgs.options = {
        flipY: true,
        generateMipmaps: true,
        minFilter: LinearMipMapLinearFilter,
        magFilter: LinearFilter,
        needsUpdate: true
      };

      maps.push(textureArgs);
    }

    return maps;
  }
}

export default HeightMap;
