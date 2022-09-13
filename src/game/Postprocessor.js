import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three'; // TODO: don't import all
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

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

const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
const backgrounds = {};
const materials = {};

// TODO: can we use traverseVisible? is it more efficient?

const Postprocessor = () => {
  const { gl: renderer, camera, scene, size } = useThree();

  const bloomComposer = useRef();
  const finalComposer = useRef();

  function darkenNonBloomed(obj) {
    if (obj.isScene && obj.background) {
      backgrounds[obj.uuid] = obj.background;
      obj.background = null;
    }
    if (obj.isScene || obj.isGroup) {
      obj.children.forEach((child) => {
        darkenNonBloomed(child);
      });
    } else if (obj.isLensflare) {
      obj.visible = false;
    } else if (obj.material && !obj.userData.bloom) {
      // TODO: is double-traversing some nodes, that's why this "if" is here
      //  why is this happening?
      if (obj.material.uuid !== darkMaterial.uuid) {
        materials[obj.uuid] = obj.material;
        if (obj.material.displacementMap) {
          obj.material.colorWrite = false;  // NOTE: this strategy will break colorWrite if we ever use it
        } else {
          obj.material = darkMaterial;
        }
      }
    }
  }

  function restoreMaterial( obj ) {
    if (obj.isScene && backgrounds[obj.uuid]) {
      obj.background = backgrounds[obj.uuid];
    }
    if (obj.isScene || obj.isGroup) {
      obj.children.forEach((child) => {
        restoreMaterial(child);
      });
    } else if (obj.isLensflare) {
      obj.visible = true;
    } else if ( materials[ obj.uuid ] ) {
      obj.material = materials[ obj.uuid ];
      delete materials[ obj.uuid ];
      if (obj.material.displacementMap) {
        obj.material.colorWrite = true;
      }
    }
  }

  useEffect(() => {
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // THREE.NoToneMapping // default
    // THREE.LinearToneMapping
    // THREE.ReinhardToneMapping
    // THREE.CineonToneMapping
    // THREE.ACESFilmicToneMapping
    // THREE.CustomToneMapping

    const renderScene = new RenderPass( scene, camera );

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2( size.width, size.height ),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 2;
    bloomPass.radius = 0.25;

    bloomComposer.current = new EffectComposer( renderer );
    bloomComposer.current.renderToScreen = false;
    bloomComposer.current.addPass( renderScene );
    bloomComposer.current.addPass( bloomPass );

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
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
    finalPass.needsSwap = true;
  
    finalComposer.current = new EffectComposer( renderer );
    finalComposer.current.addPass( renderScene );
    finalComposer.current.addPass( finalPass );
  }, []);

  useFrame(({ scene }) => {
    if (!(bloomComposer.current && finalComposer.current)) return;

    // render scene with bloom
    scene.traverse(darkenNonBloomed);
    bloomComposer.current.render();
    scene.traverse(restoreMaterial);

    // render the entire scene, then render bloom scene on top
    finalComposer.current.render();
  }, 1);

  return null;
};

export default Postprocessor;