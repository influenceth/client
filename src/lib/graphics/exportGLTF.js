import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const save = (blob, filename) => {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const saveString = (text, filename) => {
  save(new Blob([ text ], { type: 'text/plain' }), filename);
};

const saveArrayBuffer = (buffer, filename) => {
  save(new Blob([ buffer ], { type: 'application/octet-stream' }), filename);
};

const exportGLTF = (input, filename, onComplete) => {
  const gltfExporter = new GLTFExporter();
  try {
    gltfExporter.parse(input, function (result) {
      if (result instanceof ArrayBuffer) {
        saveArrayBuffer(result, `${filename}.glb`);
      } else {
        const output = JSON.stringify( result, null, 2 );
        saveString(output, `${filename}.gltf`);
      }
      if (onComplete) onComplete(true);
    });
  } catch (e) {
    if (onComplete) onComplete(false);
  }
};

export default exportGLTF;
