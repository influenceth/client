import { useEffect, useRef } from '~/lib/react-debug';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshBasicMaterial, ShaderMaterial, Vector2, WebGLRenderTarget, FloatType, RGBAFormat, SRGBColorSpace, ACESFilmicToneMapping } from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import useStore from '~/hooks/useStore';

export const BLOOM_LAYER = 11;

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D baseTexture;
  uniform sampler2D bloomTexture;

  varying vec2 vUv;

  // vec4 gammaCorrection (vec4 color, float gamma) {
  //   return vec4(pow(color.rgb, vec3(1. / gamma)).rgb, color.a);
  // }

  void main() {
    // vec4 preGamma = vec4(1.5) * texture2D(baseTexture, vUv) + vec4(0.75) * texture2D(bloomTexture, vUv);
    // gl_FragColor = preGamma;
    // gl_FragColor = gammaCorrection(preGamma, 1.5);
    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
  }
`;

const darkMaterial = new MeshBasicMaterial({ color: 'black' });
const backgrounds = {};
const colors = {};
const materials = {};

const defaultBloomParams = {
  threshold: 0,
  strength: 0.8,
  radius: 0.5,
}

const Postprocessor = ({ enabled, bloomParams = defaultBloomParams }) => {
  const { gl: renderer, camera, scene, size } = useThree();

  const pixelRatio = useStore(s => s.graphics.pixelRatio || 1);

  const bloomPass = useRef();
  const bloomComposer = useRef();
  const finalComposer = useRef();

  function darkenNonBloomed(obj) {
    if (obj.isScene && obj.background) {
      backgrounds[obj.uuid] = obj.background;
      obj.background = null;
    }
    if (obj.isLensflare) {
      obj.visible = false;
    } else if (obj.material && obj.material.opacity === 0) {
      obj.visible = false;
      // TODO (enhancement): support translucent materials by dynamically
      //  generating darkMaterial as needed for each opacity (i.e. darkMaterials[opacity])
      //  ... will only need to generate on first pass
    } else if (obj.material) {
      if (!obj.layers.isEnabled(BLOOM_LAYER)) {
        // TODO: is double-traversing some nodes, that's why these if's are here
        //  why is this happening?
        if (obj.material.displacementMap) {
          if (!Object.keys(colors).includes(obj.uuid)) {
            colors[obj.uuid] = obj.material.color;
            obj.material.setValues({ color: 0x000000 });
          }
        } else if (obj.material.uuid !== darkMaterial.uuid) {
          materials[obj.uuid] = obj.material;
          obj.material = darkMaterial;
        }
      }
    }
  }

  function restoreMaterial( obj ) {
    if (obj.isScene && backgrounds[obj.uuid]) {
      obj.background = backgrounds[obj.uuid];
    }
    if (obj.isLensflare) {
      obj.visible = true;
    } else if (obj.material && obj.material.opacity === 0) {
      obj.visible = true;
    } else if (obj.material) {
      if (obj.material.displacementMap && Object.keys(colors).includes(obj.uuid)) {
        obj.material.setValues({ color: 0xffffff });
        delete colors[ obj.uuid ];
      } else if (!obj.material.displacementMap && materials[ obj.uuid ]) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
      }
    }
  }

  useEffect(import.meta.url, () => {
    renderer.toneMapping = bloomParams?.toneMapping === undefined ? ACESFilmicToneMapping : bloomParams?.toneMapping;
  }, [bloomParams?.toneMapping]);

  useEffect(import.meta.url, () => {
    renderer.toneMappingExposure = bloomParams?.toneMappingExposure || 1;
  }, [bloomParams?.toneMappingExposure]);

  useEffect(import.meta.url, () => {
    renderer.setPixelRatio(pixelRatio);
    const renderScene = new RenderPass(scene, camera);

    bloomPass.current = new UnrealBloomPass(new Vector2(size.width * pixelRatio, size.height * pixelRatio));
    Object.keys(defaultBloomParams).forEach((k) => {
      bloomPass.current[k] = Object.keys(bloomParams).includes(k) ? bloomParams[k] : defaultBloomParams[k];
    });

    const target = new WebGLRenderTarget(size.width * pixelRatio, size.height * pixelRatio, {
      format: RGBAFormat,
      colorSpace: SRGBColorSpace,
      type: FloatType
    });

    bloomComposer.current = new EffectComposer(renderer, target);
    bloomComposer.current.renderToScreen = false;
    bloomComposer.current.addPass(renderScene);
    bloomComposer.current.addPass(bloomPass.current);

    const selectiveBloomPass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.current.renderTarget2.texture }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        defines: {}
      }),
      'baseTexture'
    );

    selectiveBloomPass.needsSwap = true;
    
    const outputPass = new OutputPass();

    finalComposer.current = new EffectComposer(renderer, target);
    finalComposer.current.addPass(renderScene);
    finalComposer.current.addPass(selectiveBloomPass);
    finalComposer.current.addPass(outputPass);
  }, [bloomParams, size.width, size.height, pixelRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ camera, gl, scene }) => {
    try {
      if (!enabled) return gl.render(scene, camera);
      if (!(bloomComposer.current && finalComposer.current)) return;

      // render scene with bloom
      scene.traverse(darkenNonBloomed);
      bloomComposer.current.render();
      scene.traverse(restoreMaterial);

      // render the entire scene, then render bloom scene on top
      finalComposer.current.render();
    } catch(e) {
      console.warn('Caught rendering error', e);
    }
  }, 2);

  return null;
};

export default Postprocessor;