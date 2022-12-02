import {
  ShaderMaterial,
} from 'three';
import resourceSamplerShader from '~/game/scene/asteroid/shaders/resourceSampler.glsl';
import TextureRenderer from '~/lib/graphics/TextureRenderer';

let _textureRenderer;
function getTextureRenderer() {
  if (!_textureRenderer) {
    _textureRenderer = new TextureRenderer();
  }
  return _textureRenderer;
}

export function generateResourceSampler(resource, plotTally, config) {
  const resolution = Math.ceil(Math.sqrt(plotTally / 4));
  const material = new ShaderMaterial({
    fragmentShader: resourceSamplerShader,
    uniforms: {
      uPlotTally: { type: 'f', value: plotTally },
      uResolution: { type: 'f', value: resolution },
      uResource: { type: 'f', value: resource },
      uSeed: { type: 'v3', value: config.seed },
    }
  });
  
  // const debugBitmap = getTextureRenderer().renderBitmap(resolution, resolution, material, { magFilter: NearestFilter });
  // const canvas = document.getElementById('test_canvas');
  // if (!!canvas) {
  //   canvas.style.height = `${debugBitmap.height}px`;
  //   canvas.style.width = `${debugBitmap.width}px`;
  //   canvas.style.zoom = 300 / debugBitmap.width;
  //   const ctx = canvas.getContext('bitmaprenderer');
  //   ctx.transferFromImageBitmap(debugBitmap);
  // } else {
  //   console.log('#test_canvas not found!');
  // }

  const texture = getTextureRenderer().render(resolution, resolution, material);
  texture.options = { needsUpdate: true };
  return texture.buffer;
}

export function pickSample(textureBuffer, index) {
  return textureBuffer[index] / 255;
}