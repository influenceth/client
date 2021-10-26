import {
  DataTexture,
  TextureLoader,
  ImageBitmapLoader,
  CanvasTexture,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  Vector3,
  LinearMipMapLinearFilter,
  LinearFilter,
  RGBFormat
} from 'three';
import { unitFiboCubeSphere } from '~/lib/graphics/fiboUtils';
import fiboShader from './fibo.glsl';

class FiboMap {
  constructor(res, config, textureRenderer) {
    this.res = res;
    this.config = config;
    this.textureRenderer = textureRenderer;
    this.points = unitFiboCubeSphere(Math.round(4 * Math.PI * config.radius * config.radius / 1e6));
    console.log('points', this.points);

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
      const maxPoints = 500;
      const points = this.points[i].slice(0, maxPoints).map((p) => new Vector2(p.x, p.y));
      const indices = this.points[i].slice(0, maxPoints).map((p) => p.z);
      while (points.length < maxPoints) {
        points.push(new Vector2(0.0));
      }
      material = new ShaderMaterial({
        fragmentShader: fiboShader,
        uniforms: {
          uIndices: { type: 'i', value: indices },
          uPoints: { type: 'v2', value: points },
          uPointTally: { type: 'i', value: points.length },//this.points[i].length },
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
