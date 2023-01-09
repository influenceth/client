import {
  DataTexture,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  MeshBasicMaterial,
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
    this.isOffscreen = (typeof OffscreenCanvas !== 'undefined');

    let canvas;
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

  render(width, height, material) {
    this.plane.material = material;
    this.target.setSize(width, height);
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    const buffer = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.target, 0, 0, width, height, buffer);
    return { buffer, width, height, format: RGBAFormat };
  }

  renderBitmap(width, height, material, dataTextureOptions = {}) {
    // (transferToImageBitmap only supported in offscreencanvas, so here is workaround for "onscreen" canvas)
    if (!this.isOffscreen) {
      const map = this.render(width, height, material);
      const dataTexture = new DataTexture(map.buffer, map.width, map.height, map.format);
      dataTexture.flipY = true;
      dataTexture.generateMipmaps = true;
      dataTexture.minFilter = LinearMipMapLinearFilter;
      dataTexture.magFilter = LinearFilter;
      Object.keys(dataTextureOptions).forEach((k) => dataTexture[k] = dataTextureOptions[k]);
      dataTexture.needsUpdate = true;
      return dataTexture;
    }

    this.plane.material = material;
    this.renderer.setSize(width, height);
    this.renderer.domElement.width = width;
    this.renderer.domElement.height = height;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.transferToImageBitmap();
  }

  textureToDataBuffer(texture) {
    const pixels = this.render(
      texture.image?.width || 0,
      texture.image?.height || 0,
      new MeshBasicMaterial({ map: texture })
    );
    return pixels?.buffer;
  }
}

export default TextureRenderer;
