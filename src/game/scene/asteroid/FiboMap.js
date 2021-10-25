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
import fiboShader from './fibo.glsl';

const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians

const faceIndexes = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 };

const generateFiboCubeSphere = (samples) => {
  const faces = [[],[],[],[],[],[]];

  for (let index = 0; index < samples; index++) {
    const y = 1 - (index / (samples - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y
    const theta = phi * index; // golden angle increment

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const xAbs = Math.abs(x);
    const yAbs = Math.abs(y);
    const zAbs = Math.abs(z);
    if (xAbs > yAbs && xAbs > zAbs) {
      faces[faceIndexes[x > 0 ? 'px' : 'nx']].push(new Vector2((y / xAbs + 1) / 2, (z / xAbs + 1) / 2));
    } else if (yAbs > xAbs && yAbs > zAbs) {
      faces[faceIndexes[y > 0 ? 'py' : 'ny']].push(new Vector2((x / yAbs + 1) / 2, (z / yAbs + 1) / 2));
    } else {
      faces[faceIndexes[z > 0 ? 'pz' : 'nz']].push(new Vector2((x / zAbs + 1) / 2, (y / zAbs + 1) / 2));
    }
    // TODO: are negative dimensions ok?
    // TODO: check that the orientation on these is correct (maybe by writing number or sizing up so we know spiral is contiguous OR checking from polar coordinates)
  }

  return faces;
};

class FiboMap {
  constructor(res, config, textureRenderer) {
    this.res = res;
    this.config = config;
    this.textureRenderer = textureRenderer;
    console.log('TExTURE', textureRenderer);
    console.log('pre fibo', config.radius)
    this.points = generateFiboCubeSphere(Math.round(4 * Math.PI * config.radius * config.radius / 1e6));
    console.log('fibomap', this.points);

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
      const points = this.points[i].slice(0, 400);
      while(points.length < 100) points.push(new Vector2(0, 0));
      material = new ShaderMaterial({
        fragmentShader: fiboShader,
        uniforms: {
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
