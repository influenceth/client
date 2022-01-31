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
  RGBAFormat,
  Color,
  BoxGeometry,
  MeshBasicMaterial,
  DoubleSide
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

  render(width, height, material) {
    this.plane.material = material;
    this.target.setSize(width, height);
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.target, 0, 0, width, height, buffer);

    return { buffer, width, height, format: RGBAFormat };
  }

  renderBitmap(width, height, material) {
    this.plane.material = material;
    this.target.setSize(width, height);
    this.renderer.domElement.width = width;
    this.renderer.domElement.height = height;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    const bitmap = this.renderer.domElement.transferToImageBitmap();
    return bitmap;
  }
}

export default TextureRenderer;
