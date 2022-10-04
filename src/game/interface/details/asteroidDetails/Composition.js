import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BackSide,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three';
import { useFrame, useThree } from '@react-three/fiber';

import { cleanupScene } from '~/game/scene/asteroid/helpers/utils';

import theme, { hexToGLSL } from '~/theme';

const hexToLinear = (hex) => new Color(hex).convertSRGBToLinear();

const segments = 100;

const rotationPerFrame = 0.1; // TODO: ease function would probably look better

const AsteroidComposition = ({ asteroid, focus, highlight, inputResourceGroups, onAnimationChange }) => {
  const { camera, gl, scene } = useThree();

  const groupRef = useRef();

  const rotation = useRef(0);
  const targetRotation = useRef(0);

  const highlighted = useRef();

  const resources = useRef();
  
  useEffect(() => {
    if (asteroid && groupRef.current) {
      resources.current = [...inputResourceGroups].sort((a, b) => a.portion - b.portion);

      let totalTheta = 0;
      resources.current.forEach(({ category, abundance }, i) => {
        const sliceTheta = 2 * Math.PI * abundance;
        const geometry = new CircleGeometry(1.0, segments, totalTheta, sliceTheta);
        const material = new MeshBasicMaterial({
          color: hexToLinear(theme.colors.resources[category]),
          alphaMap: new Texture(),  // include so vUv is set
          side: BackSide, // (to make angles work as designed)
          transparent: true
        });
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uHighlight = { type: 'b', value: false };
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <alphamap_pars_fragment>',
              'uniform bool uHighlight;'
            )
            .replace(
              '#include <alphamap_fragment>',
              `
                float len = length(vUv - 0.5) / 0.5;
                float fade = min(1.0, uHighlight ? 0.4 : 1.25 * (1.0 - len));
                float sum = smoothstep(0.75, 0.76, len)
                  - smoothstep(0.79, 0.8, len)
                  + smoothstep(0.79, 0.8, len) * fade;
                diffuseColor.a *= sum;
              `
            )
          ;
          material.userData.shader = shader;
        };
        groupRef.current.children[i].userData.resource = category;
        groupRef.current.children[i].geometry = geometry;
        groupRef.current.children[i].material = material;

        resources.current[i].start = totalTheta;
        if (resources.current[i].start >= 2 * Math.PI) {
          resources.current[i].start -= 2 * Math.PI;
        }

        totalTheta += sliceTheta;        
      });
      groupRef.current.setRotationFromAxisAngle(
        new Vector3(0, 1, 0),
        -Math.PI
      );

      const coverInner = new Mesh(
        new CircleGeometry(0.70, segments),
        new MeshBasicMaterial({
          color: hexToLinear('#202b2f')
        })
      );
      coverInner.position.add(new Vector3(0, 0, 0.002));
      scene.add(coverInner);

      camera.position.set(0, 0, 1.4);
      camera.updateProjectionMatrix();

      gl.render(scene, camera);
      onAnimationChange(true);

      return () => {
        try {
          cleanupScene(scene);
        } catch(e) {
          console.warn(e);
        }
      }
    }
  }, [!!asteroid]);

  useEffect(() => {
    if (highlighted.current) {
      const unhighlight = groupRef.current.children.find((g) => g.userData.resource === highlighted.current);
      if (unhighlight) {
        unhighlight.material.userData.shader.uniforms.uHighlight.value = false;
      }
    }
    if (highlight) {
      const toHighlight = groupRef.current.children.find((g) => g.userData.resource === highlight);
      if (toHighlight) {
        toHighlight.material.userData.shader.uniforms.uHighlight.value = true;
      }
      highlighted.current = highlight;
    }
    onAnimationChange(true);
  }, [highlight]);

  useEffect(() => {
    const target = resources.current.find((c) => c.category === focus);
    if (target) {
      targetRotation.current = -1 * target.start;
      const distance = Math.abs(targetRotation.current - rotation.current);
      if (distance > Math.abs(targetRotation.current - (rotation.current + 2 * Math.PI))) {
        rotation.current += 2 * Math.PI;
      }
      if (distance > Math.abs(targetRotation.current - (rotation.current - 2 * Math.PI))) {
        rotation.current -= 2 * Math.PI;
      }
    }
    onAnimationChange(true);
  }, [focus]);

  useFrame(() => {
    if (!groupRef.current) return;

    // TODO: could use gsap to set a "totalRotation" ref, keep as "previousRotation" ref, then call rotateZ on the difference every frame
    //  (to implement easing)

    // TODO: same for hover animations on a uniform value (even easier)
    // - Separate each wedge to manage its own animations. For animations to be over, cycle through all. 
    // - on focus, stop highlighting (rotate and add sub-wedges)

    if (rotation.current < targetRotation.current) {
      const stepSize = Math.min(targetRotation.current - rotation.current, rotationPerFrame);
      rotation.current += stepSize;
      groupRef.current.rotateZ(stepSize);
    }
    if (rotation.current > targetRotation.current) {
      const stepSize = -Math.min(rotation.current - targetRotation.current, rotationPerFrame);
      rotation.current += stepSize;
      groupRef.current.rotateZ(stepSize);
    }
    if (rotation.current === targetRotation.current) {
      onAnimationChange(false);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh />
      <mesh />
      <mesh />
      <mesh />
      <mesh />
    </group>
  );

  return null;
};

export default AsteroidComposition;