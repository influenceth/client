import {
  DataTexture,
  ShaderMaterial,
  Vector2,
  LinearMipMapLinearFilter,
  LinearFilter
} from 'three';
import normalShader from './normal.glsl';

class NormalMap {
  constructor(res, heightMap, config, textureRenderer) {
    this.res = res;
    this.heightMap = heightMap.map(h => {
      const tex = new DataTexture(h.buffer, h.width, h.height, h.format);
      return Object.assign(tex, h.options);
    });
    this.textureRenderer = textureRenderer;
    return this._generateNormalMap(config);
  }

  _generateNormalMap(config) {
    let material;
    const maps = [];

    for (let i = 0; i < 6; i++) {
      material = new ShaderMaterial({
        extensions: { derivatives: true },
        fragmentShader: normalShader,
        uniforms: {
          tHeightmap: { type: 't', value: this.heightMap[i] },
          uNormalIntensity: { type: 'f', value: config.normalIntensity },
          uResolution: { type: 'v2', value: new Vector2(this.res, this.res) }
        }
      });

      const textureArgs = this.textureRenderer.render(this.res, this.res, material);
      textureArgs.options = {
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

export default NormalMap;
