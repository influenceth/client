import {
  DataTexture,
  TextureLoader,
  ImageBitmapLoader,
  CanvasTexture,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  LinearMipMapLinearFilter,
  LinearFilter
} from 'three';
import colorShader from './color.glsl';

const rampsPath = `${process.env.PUBLIC_URL}/textures/asteroid/ramps.png`;

class ColorMap {
  constructor(res, heightMap, config, textureRenderer) {
    this.res = res;
    this.heightMap = heightMap.map(h => {
      const tex = new DataTexture(h.buffer, h.width, h.height, h.format);
      return Object.assign(tex, h.options);
    });
    this.config = config;
    this.textureRenderer = textureRenderer;
  }

  async generateColorMap() {
    let material, loader, image, ramps;

    try {
      loader = new TextureLoader();
      ramps = await loader.loadAsync(rampsPath);
    } catch (e) {
      loader = new ImageBitmapLoader();
      image = await loader.loadAsync(rampsPath);
      ramps = new CanvasTexture(image);
    }

    ramps.minFilter = NearestFilter;
    ramps.magFilter = NearestFilter;
    const maps = [];

    for (let i = 0; i < 6; i++) {
      material = new ShaderMaterial({
        fragmentShader: colorShader,
        uniforms: {
          tHeightMap: { type: 't', value: this.heightMap[i] },
          tRamps: { type: 't', value: ramps },
          uSpectral: { type: 'f', value: this.config.spectralType },
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

export default ColorMap;
