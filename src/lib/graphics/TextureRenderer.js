import {
  DataTexture,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneBufferGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';

class TextureRenderer {
  constructor() {
    let canvas;
    this.isOffscreen = (typeof OffscreenCanvas !== 'undefined');
    if (this.isOffscreen) {
      canvas = new OffscreenCanvas(0, 0);
      canvas.style = { width: 0, height: 0 };
    }

    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 1000);
    this.target = new WebGLRenderTarget(1, 1, {
      minFilter: LinearMipMapLinearFilter,
      magFilter: LinearFilter
    });
    this.geometry = new PlaneBufferGeometry(2, 2);
    this.material = new ShaderMaterial();
    this.plane = new Mesh(this.geometry, this.material);
    this.plane.position.z = -10;
    this.scene.add(this.plane);
    return this;
  }

  render(width, height, material, benchmark) {
    if (!benchmark) benchmark = () => {};
    benchmark('inRender');
    this.plane.material = material;
    benchmark('setMaterial');
    this.target.setSize(width, height);
    benchmark('setSize');
    this.renderer.setRenderTarget(this.target);
    benchmark('setRenderTarget');
    this.renderer.render(this.scene, this.camera);
    benchmark('render');
    const buffer = new Uint8Array(width * height * 4);
    benchmark('createBuffer');
    this.renderer.readRenderTargetPixels(this.target, 0, 0, width, height, buffer);
    benchmark('read');
    return { buffer, width, height, format: RGBAFormat };
  }

  renderBitmap(width, height, material, benchmark) {
    // (transferToImageBitmap only supported in offscreencanvas, so here is workaround for "onscreen" canvas)
    if (!this.isOffscreen) {
      const map = this.render(width, height, material, benchmark);
      const dataTexture = new DataTexture(map.buffer, map.width, map.height, map.format);
      dataTexture.flipY = true;
      dataTexture.generateMipmaps = true;
      dataTexture.minFilter = LinearMipMapLinearFilter;
      dataTexture.magFilter = LinearFilter;
      dataTexture.needsUpdate = true;
      return dataTexture;
    }

    if (!benchmark) benchmark = () => {};
    benchmark('inRender');
    this.plane.material = material;
    benchmark('setMaterial');
    this.renderer.setSize(width, height);
    this.renderer.domElement.width = width;
    this.renderer.domElement.height = height;
    benchmark('setSize');
    this.renderer.setRenderTarget(null);
    benchmark('setRenderTarget');
    this.renderer.render(this.scene, this.camera);
    benchmark('render');
    const bitmap = this.renderer.domElement.transferToImageBitmap();
    benchmark('bitmap');
    return bitmap;
  }
}

export default TextureRenderer;
