import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackSide,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Texture,
  Vector3,
  sRGBEncoding,
} from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { cleanupScene } from '~/game/scene/asteroid/helpers/utils';
import theme from '~/theme';
import { keyify } from '~/lib/utils';

const hexToLinear = (hex) => new Color(hex).convertSRGBToLinear();

const margin = 0.001 * 2 * Math.PI;
const rotationPerFrame = 0.1;
const segmentsPerCircle = 120; // target 1 segment per 3 degrees
const dummyCategory = { abundance: 0.2, categoryKey: 'unscanned', resources: [] };

const getSegments = (centralAngle) => {
  return Math.max(2, Math.ceil(segmentsPerCircle * centralAngle / 2 * Math.PI));
};

const AsteroidComposition = ({ abundances, asteroid, focus, noColor, noGradient, hover, onAnimationChange, ready }) => {
  const { camera, gl, scene } = useThree();

  const groupRef = useRef();
  const obscurer = useRef();

  const obscurerTheta = useRef(0);
  const rotation = useRef(0);
  const targetRotation = useRef(0);

  const hovered = useRef();

  const resources = useRef();

  const focusKey = keyify(focus);

  useEffect(() => {
    if (asteroid && abundances) {
      hovered.current = null;
      obscurerTheta.current = 0;
      rotation.current = 0;
      targetRotation.current = 0;

      const slices = abundances.length > 0 ? [...abundances] : Array(5).fill(dummyCategory);
      resources.current = slices.sort((a, b) => b.abundance - a.abundance);

      groupRef.current = new Group();
      scene.add(groupRef.current);

      let totalTheta = 0;
      resources.current.forEach(({ categoryKey, abundance }, i) => {
        const sliceTheta = 2 * Math.PI * abundance;
        const geometry = new CircleGeometry(1.0, getSegments(sliceTheta), totalTheta + margin, sliceTheta - 2 * margin);
        const material = new MeshBasicMaterial({
          color: noColor ? hexToLinear('#222222') : hexToLinear(theme.colors.resources[categoryKey]),
          alphaMap: new Texture(),  // include so vUv is set
          side: BackSide, // (to make angles work as designed)
          toneMapped: false,
          transparent: true
        });
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uHover = { type: 'f', value: 0.0 };
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <alphamap_pars_fragment>',
              'uniform float uHover;'
            )
            .replace(
              '#include <alphamap_fragment>',
              `
                float len = length(vUv - 0.5) / 0.5;

                float fade = ${noGradient ? `0.0` : `max(
                  0.4 * (1.0 - step(0.8 + (0.2 * uHover), len)),
                  min(1.0, 1.25 * (1.0 - len))
                )`};

                float sum = smoothstep(0.75, 0.76, len)
                  - smoothstep(0.79, 0.8, len)
                  + smoothstep(0.79, 0.8, len) * fade;
                diffuseColor.a *= sum;
              `
            )
          ;
          material.userData.shader = shader;
        };
        const mesh = new Mesh(geometry, material);
        mesh.userData.resource = categoryKey;
        groupRef.current.add(mesh);

        resources.current[i].start = totalTheta;
        if (resources.current[i].start >= 2 * Math.PI) {
          resources.current[i].start -= 2 * Math.PI;
        }
        resources.current[i].thetaWidth = sliceTheta;

        totalTheta += sliceTheta;
      });
      groupRef.current.setRotationFromAxisAngle(
        new Vector3(0, 1, 0),
        -Math.PI
      );

      const coverInner = new Mesh(
        new CircleGeometry(0.70, segmentsPerCircle),
        new MeshBasicMaterial({
          color: hexToLinear('#061317'),
          toneMapped: false,
        })
      );
      coverInner.position.add(new Vector3(0, 0, 0.002));
      scene.add(coverInner);

      camera.position.set(0, 0, 1.4);
      camera.updateProjectionMatrix();

      obscurer.current = new Mesh(
        new CircleGeometry(1.2, segmentsPerCircle, 0, 2 * Math.PI),
        new MeshBasicMaterial({ color: 0x000000 })
      );
      obscurer.current.position.add(new Vector3(0, 0, 0.001));
      obscurer.current.rotateZ(Math.PI);
      scene.add(obscurer.current);

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
  }, [!!asteroid, abundances]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hovered.current = hover;
    onAnimationChange(true);
  }, [hover]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const target = resources.current.find((c) => c.categoryKey === focusKey);
    if (target) {
      targetRotation.current = -1 * target.start;
      const distance = Math.abs(targetRotation.current - rotation.current);
      if (distance > Math.abs(targetRotation.current - (rotation.current + 2 * Math.PI))) {
        rotation.current += 2 * Math.PI;
      }
      if (distance > Math.abs(targetRotation.current - (rotation.current - 2 * Math.PI))) {
        rotation.current -= 2 * Math.PI;
      }

      let thetaStart = target.start;
      let useWidth = target.resources.length;
      const widthTotal = target.resources.reduce((acc, cur, i) => acc + i + 1, 0);
      target.resources.forEach((r) => {
        // (technically shouldn't add to more than 1, but this seems to be the largest possible without clipping)
        const height = 0.8 + 0.27 * r.abundance / target.resources[0].abundance;
        const thetaWidth = target.thetaWidth * useWidth / widthTotal;
        useWidth--;

        const subSliceMaterial = new MeshBasicMaterial({
          color: hexToLinear(theme.colors.resources[target.categoryKey]),
          alphaMap: new Texture(),  // include so vUv is set
          side: BackSide, // (to make angles work as designed),
          toneMapped: false,
          transparent: true
        });
        subSliceMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uOpacity = { type: 'f', value: 0.2 + 0.7 * (1 - r.abundance / target.resources[0].abundance) };
          shader.uniforms.uReveal = { type: 'f', value: 0.0 };
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <alphamap_pars_fragment>',
              `uniform float uOpacity;
              uniform float uReveal;`
            )
            .replace(
              '#include <alphamap_fragment>',
              `
                float len = length(vUv - 0.5) / 0.5;
                diffuseColor.a *= uOpacity * (1.0 - smoothstep(uReveal, uReveal + 0.1, len));
              `
            )
          ;
          subSliceMaterial.userData.shader = shader;
        };

        const subSlice = new Mesh(
          new RingGeometry(0.79, height, getSegments(thetaWidth), 1, thetaStart + margin, thetaWidth - 2 * margin),
          subSliceMaterial
        );
        subSlice.userData.parentGroup = focusKey;
        subSlice.position.add(new Vector3(0, 0, 0.001));
        groupRef.current.add(subSlice);

        thetaStart += thetaWidth;
      });

      // clear "hover" state
      hovered.current = null;
    }

    onAnimationChange(true);
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // this triggers the intro effect (i.e. removing the obscurer layer)
  useEffect(() => {
    if (ready) {
      onAnimationChange(true);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!groupRef.current) return;

    // obscurer reveal
    if (ready) {
      if (obscurer.current && obscurerTheta.current < 2 * Math.PI) {
        obscurerTheta.current += 0.1;
        const centralAngle = 2 * Math.PI - obscurerTheta.current;
        obscurer.current.geometry = new CircleGeometry(1.2, getSegments(centralAngle), 0, centralAngle);
      } else if (obscurer.current) {
        scene.remove(obscurer.current);
        obscurer.current = null;
      }
    }

    // focus growths
    const focusComplete = groupRef.current.children.reduce((acc, mesh) => {
      if (mesh.userData.parentGroup) {
        if (mesh.material.userData.shader) {
          if (mesh.userData.parentGroup === focusKey) {
            if (mesh.material.userData.shader.uniforms.uReveal.value < 1.0) {
              mesh.material.userData.shader.uniforms.uReveal.value += 0.025;
              return false;
            }
          } else if (mesh.material.userData.shader.uniforms.uReveal.value > 0.0) {
            mesh.material.userData.shader.uniforms.uReveal.value -= 0.025;
            return false;
          }
        } else {
          return false;
        }
      }
      return acc;
    }, true);
    if (!focusKey && focusComplete) {
      groupRef.current.children
        .filter((mesh) => mesh.userData.parentGroup)
        .forEach((mesh) => groupRef.current.remove(mesh));
    }

    // hover growths
    const hoversComplete = groupRef.current.children.reduce((acc, mesh) => {
      if (mesh.userData.resource) {
        if (mesh.material.userData.shader) {
          if (mesh.userData.resource === hovered.current) {
            if (mesh.material.userData.shader.uniforms.uHover.value < 1.0) {
              mesh.material.userData.shader.uniforms.uHover.value += 0.05;
              return false;
            }
          } else if (mesh.material.userData.shader.uniforms.uHover.value > 0.0) {
            mesh.material.userData.shader.uniforms.uHover.value -= 0.05;
            return false;
          }
        } else {
          return false;
        }
      }
      return acc;
    }, true);

    // rotations
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

    if (rotation.current === targetRotation.current && hoversComplete && focusComplete && !obscurer.current) {
      onAnimationChange(false);
    }
  });

  return null;
};

const AsteroidCompositionInCanvas = ({ animationDelay, ready, ...props }) => {
  const [delayedReady, setDelayedReady] = useState();
  const [frameloop, setFrameloop] = useState();

  const onAnimationChange = useCallback((which) => {
    setFrameloop(which ? 'always' : 'never');
  }, []);

  useEffect(() => {
    if (ready) {
      setTimeout(() => {
        setDelayedReady(true);
      }, animationDelay || 0);
    }
  }, [ready]);

  return (
    <Canvas
      antialias
      frameloop={frameloop}
      outputEncoding={sRGBEncoding}>
      <AsteroidComposition
        onAnimationChange={onAnimationChange}
        ready={delayedReady ? 1 : 0}
        {...props} />
    </Canvas>
  );
};

export default AsteroidCompositionInCanvas;