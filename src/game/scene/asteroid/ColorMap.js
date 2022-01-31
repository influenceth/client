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

let first = true;
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
        vertexShader: `
          varying vec3 vUv; 

          void main() {
            vUv = position; 
      
            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition; 
          }
        `,
        uniforms: {
          tHeightMap: { type: 't', value: this.heightMap[i] },
          tRamps: { type: 't', value: ramps },
          uSpectral: { type: 'f', value: this.config.spectralType },
          uResolution: { type: 'v2', value: new Vector2(this.res, this.res) }
        }
      });

      const bitmap = this.textureRenderer.renderBitmap(this.res, this.res, material);
      // PMK vvv
      if (first) {
        const canvas = document.getElementById('test_canvas');
        canvas.style.height = `${bitmap.height}px`;
        canvas.style.width = `${bitmap.width}px`;
        const ctx = canvas.getContext('bitmaprenderer');
        ctx.transferFromImageBitmap(bitmap);
      }
      // PMK ^^^
      maps.push({ bmp: bitmap });
    }

    return maps;
  }
}

export default ColorMap;
