import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  LinearToneMapping,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector2
} from 'three';
// import * as THREE from 'three';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import useStore from '~/hooks/useStore';

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D baseTexture;
  uniform sampler2D bloomTexture;

  varying vec2 vUv;

  void main() {
    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
  }
`;

const darkMaterial = new MeshBasicMaterial({ color: 'black' });
const backgrounds = {};
const colors = {};
const materials = {};

// let taskTotal = 0;
// let taskTally = 0;
// setInterval(() => {
//   if (taskTally > 0) {
//     console.log(
//       `avg children time (over ${taskTally}): ${Math.round(1000 * taskTotal / taskTally) / 1000}ms`,
//     );
//   }
// }, 5000);
// setTimeout(() => {
//   taskTally = 0;
//   taskTotal = 0;
// }, 4000);
// const debug = (start) => {
//   taskTally++;
//   taskTotal += performance.now() - start;
// };

const defaultBloomParams = {
  threshold: 0,
  strength: 2,
  radius: 0.25
}

const Postprocessor = ({ enabled, isModelViewer, bloomParams = {} }) => {
  const { gl: renderer, camera, scene, size } = useThree();

  const pixelRatio = useStore(s => s.graphics.pixelRatio || 1);

  const bloomPass = useRef();
  const fxaaPass = useRef();
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
      if (!obj.userData.bloom) {
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

  useEffect(() => {
    if (enabled && isModelViewer) {
      renderer.toneMapping = LinearToneMapping;
      // renderer.toneMapping = 
      // THREE.NoToneMapping // default
      // THREE.LinearToneMapping // 3.75
      // THREE.ReinhardToneMapping  // 4.5
      // THREE.CineonToneMapping
      // THREE.ACESFilmicToneMapping  // seems to be the actual default
      // THREE.CustomToneMapping
      // ;
      renderer.toneMappingExposure = 3.75;
      return () => {
        renderer.toneMappingExposure = 1;
      }
    }

  }, [enabled, isModelViewer])

  useEffect(() => {
    const renderScene = new RenderPass( scene, camera );

    bloomPass.current = new UnrealBloomPass(new Vector2( size.width, size.height ));
    Object.keys(defaultBloomParams).forEach((k) => {
      bloomPass.current[k] = Object.keys(bloomParams).includes(k) ? bloomParams[k] : defaultBloomParams[k];
    });

    bloomComposer.current = new EffectComposer( renderer );
    bloomComposer.current.renderToScreen = false;
    bloomComposer.current.addPass( renderScene );
    bloomComposer.current.addPass( bloomPass.current );

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

    fxaaPass.current = new ShaderPass( FXAAShader );
    fxaaPass.current.material.uniforms['resolution'].value.x = 1 / ( size.width * pixelRatio );
    fxaaPass.current.material.uniforms['resolution'].value.y = 1 / ( size.height * pixelRatio );
  
    finalComposer.current = new EffectComposer( renderer );
    finalComposer.current.addPass( renderScene );
    finalComposer.current.addPass( selectiveBloomPass );
    finalComposer.current.addPass( fxaaPass.current );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bloomComposer.current) {
      bloomComposer.current.setSize( size.width, size.height );
    }
    if (bloomPass.current) {
      bloomPass.current.resolution = new Vector2( size.width, size.height );
    }
    if (finalComposer.current) {
      finalComposer.current.setSize( size.width, size.height );
    }
    if (fxaaPass.current) {
      fxaaPass.current.material.uniforms['resolution'].value.x = 1 / ( size.width * pixelRatio );
      fxaaPass.current.material.uniforms['resolution'].value.y = 1 / ( size.height * pixelRatio );
    }
  }, [size.height, size.width, pixelRatio]); // eslint-disable-line react-hooks/exhaustive-deps

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