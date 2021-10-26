import {
  DataTexture,
  TextureLoader,
  ImageBitmapLoader,
  CanvasTexture,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  LinearMipMapLinearFilter,
  LinearFilter,
  RGBFormat
} from 'three';
import { unitFiboCubeSphere } from '~/lib/graphics/fiboUtils';
import fiboShader from './fibo_texture.glsl';

class FiboMap {
  constructor(res, config, textureRenderer) {
    this.res = res;
    this.config = config;
    this.textureRenderer = textureRenderer;
    const faceData = unitFiboCubeSphere(Math.round(4 * Math.PI * config.radius * config.radius / 1e6), true);
    this.dataTextures = faceData.map((faceData) => {
      return new DataTexture(faceData, 1, 1, RGBFormat);
    });
    console.log('fibomap', this.dataTextures);

    // TODO: generate fibonacci sphere coordinates based on # samples
    //  uniforms should pass in...
    //    - fibo coordinates
    //        *** SEE THIS: split by face before passing to glsl https://stackoverflow.com/a/993226
    //    - # samples (for relative size of dots)
    //    - (v2) mouse position
    //         - alpha (+ scale?) w/ distance (SEE BELOW)
    //         - voronoi segments between points within alpha range
    
    // will mouse have issue crossing face boundaries?
    
    // highlighting based on distance from mouse:
    // (gradient) pct = distance(uv, u_mouse/u_resolution);
    // hard cutoff, inversed: pct = step(0.75, 1.0-distance(st,u_mouse/u_resolution));
    // (https://thebookofshaders.com/07/)
  }

  async generateFiboMap() {
    let material;

    const maps = [];

    for (let i = 0; i < 6; i++) {
      material = new ShaderMaterial({
        fragmentShader: fiboShader,
        uniforms: {
          tData: { type: 't', value: this.dataTextures[i] },
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

export default FiboMap;
