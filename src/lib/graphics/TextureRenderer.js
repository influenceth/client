import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  WebGLRenderTarget,
  LinearMipMapLinearFilter,
  LinearFilter,
  PlaneBufferGeometry,
  ShaderMaterial,
  Mesh,
  RGBAFormat
} from 'three';

class TextureRenderer {
  constructor(renderer) {
    if (renderer === undefined) {
      this.renderer = new WebGLRenderer({ antialias: true });
    } else {
      this.renderer = renderer;
    }

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
