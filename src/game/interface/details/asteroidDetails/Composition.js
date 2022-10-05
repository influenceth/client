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
  RingGeometry,
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


// #define PI 3.1415926535897932384626433832795

// float spinner(float r, float theta, float timeOffset, float radius, float width) {
//     float time = iTime + timeOffset;
//     float thetaOnStart = mod(-time * 2.0, 2.0 * PI);
//     float thetaOnEnd = thetaOnStart + sin(time * 2.0 - PI);
    
//     float tStepOn = step(min(thetaOnStart, thetaOnEnd), theta);
//     float tStepOff = 1.0 - step(max(thetaOnStart, thetaOnEnd), theta);
    
//     float rStepOn = step(radius, r);
//     float rStepOff = 1.0 - step(radius + width, r);
//     return tStepOn * tStepOff * rStepOn * rStepOff;
// }

// void mainImage( out vec4 fragColor, in vec2 fragCoord )
// {
//     // Normalized pixel coordinates (from -1 to 1)
//     vec2 uv = 2.0*fragCoord/iResolution.xy - 1.0;
//     float r = length(uv);
//     float theta = 2.0 * atan(uv.y/uv.x) + PI;
    
//     vec3 col = vec3(1.0,0.0,0.0);
//     col.g = spinner(r, theta, 0.0, 0.5, 0.1);
//     col.g += spinner(r, theta, 1.0, 0.7, 0.1);
//     fragColor = vec4(col, 1.0);
// }

////////////////////////////////////

// #define PI 3.1415926535897932384626433832795

// float spinner(float r, float theta, float radius, float width, float timeOffset, float thetaOffset) {
//     float time = iTime - timeOffset;
//     float thetaOnStart = mod(-time * 2.0, 2.0 * PI);
//     float thetaOnEnd = thetaOnStart + sin(time * 2.0 - PI);
    
//     float tStepOn = step(min(thetaOnStart, thetaOnEnd), theta - thetaOffset);
//     float tStepOff = 1.0 - step(max(thetaOnStart, thetaOnEnd), theta - thetaOffset);
    
//     float rStepOn = step(radius, r);
//     float rStepOff = 1.0 - step(radius + width, r);
//     return tStepOn * tStepOff * rStepOn * rStepOff;
// }

// void mainImage( out vec4 fragColor, in vec2 fragCoord )
// {
//     // Normalized pixel coordinates (from -1 to 1)
//     vec2 uv = 2.0*fragCoord/iResolution.xy - 1.0;
//     float r = length(uv);
//     float theta = 2.0 * atan(uv.y/uv.x) + PI;
    
//     vec3 blue = vec3(0.20784313725490197, 0.5176470588235295, 0.6313725490196078);
//     vec3 col = (1.0 - step(0.5, r)) * vec3(0.058823529411764705, 0.1568627450980392, 0.19215686274509805);
    
//     float white = 0.1 * step(0.3, r) * (1.0 - step(0.6, r)) / ((r - 0.3) / 0.3);
//     col.r += white;
//     col.g += white;
//     col.b += white;
    
//     col += blue * spinner(r, theta, 0.475, 0.025, 0.0, 0.0);
//     col += blue * spinner(r, theta, 0.55, 0.025, 1.0, -0.25 * PI);
//     fragColor = vec4(col, 1.0);
// }

const margin = 0.001 * 2 * Math.PI;
const dummyCategory = { category: '', abundance: 0.2 };

const AsteroidComposition = ({ abundances, asteroid, focus, noColor, noGradient, hover, onAnimationChange, ready }) => {
  const { camera, gl, scene } = useThree();

  const groupRef = useRef();
  const obscurer = useRef();
  const obscurerTheta = useRef(0);

  const rotation = useRef(0);
  const targetRotation = useRef(0);

  const hovered = useRef();

  const resources = useRef();
  
  useEffect(() => {
    if (asteroid && groupRef.current) {
      const slices = abundances ? [...abundances] : [dummyCategory, dummyCategory, dummyCategory, dummyCategory, dummyCategory];
      resources.current = slices.sort((a, b) => b.abundance - a.abundance);

      let totalTheta = 0;
      resources.current.forEach(({ category, abundance }, i) => {
        const sliceTheta = 2 * Math.PI * abundance;
        const geometry = new CircleGeometry(1.0, segments, totalTheta + margin, sliceTheta - 2 * margin);
        const material = new MeshBasicMaterial({
          color: noColor ? hexToLinear('#333333') : hexToLinear(theme.colors.resources[category]),
          alphaMap: new Texture(),  // include so vUv is set
          side: BackSide, // (to make angles work as designed)
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
        groupRef.current.children[i].userData.resource = category;
        groupRef.current.children[i].geometry = geometry;
        groupRef.current.children[i].material = material;

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
        new CircleGeometry(0.70, segments),
        new MeshBasicMaterial({
          color: hexToLinear('#202b2f')
        })
      );
      coverInner.position.add(new Vector3(0, 0, 0.002));
      scene.add(coverInner);

      camera.position.set(0, 0, 1.4);
      camera.updateProjectionMatrix();

      obscurer.current = new Mesh(
        new CircleGeometry(1.2, 360, 0, 2 * Math.PI),
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
  }, [!!asteroid]);

  useEffect(() => {
    hovered.current = hover;
    onAnimationChange(true);
  }, [hover]);

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

      let thetaStart = target.start;
      let useWidth = target.resources.length;
      const widthTotal = target.resources.reduce((acc, cur, i) => acc + i + 1, 0);

      const targetTotal = Math.sqrt(target.abundance);
      // TODO: how do we calculate width (i.e. is it portion of my sqrt / total sqrt?)
      target.resources.forEach((r) => {
        const height = 0.8 + 0.35 * r.abundance / target.resources[0].abundance;  // TODO: if over 0.2, need to resize entire object
        const thetaWidth = target.thetaWidth * useWidth / widthTotal;
        useWidth--;

        const subSliceMaterial = new MeshBasicMaterial({
          color: hexToLinear(theme.colors.resources[target.category]),
          alphaMap: new Texture(),  // include so vUv is set
          side: BackSide, // (to make angles work as designed)
          transparent: true
        });
        subSliceMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uOpacity = { type: 'f', value: 0.15 + 0.65 * (1 - r.abundance / target.resources[0].abundance) };
          shader.uniforms.uReveal = { type: 'f', value: 0.0 };
          console.log(shader.uniforms);
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
          new RingGeometry(0.79, height, 100, 1, thetaStart + margin, thetaWidth - 2 * margin),
          subSliceMaterial
        );
        subSlice.userData.parentGroup = focus;
        subSlice.position.add(new Vector3(0, 0, 0.001));
        console.log('subSlice', subSlice);
        groupRef.current.add(subSlice);

        thetaStart += thetaWidth;
      });

      // clear "hover" state
      hovered.current = null;
    }

    onAnimationChange(true);
  }, [focus]);

  // this triggers the intro effect (i.e. removing the obscurer layer)
  useEffect(() => {
    if (ready) {
      onAnimationChange(true);
    }
  }, [ready]);

  useFrame(() => {
    if (!groupRef.current) return;

    // obscurer reveal
    if (ready) {
      if (obscurer.current && obscurerTheta.current < 2 * Math.PI) {
        obscurerTheta.current += 0.1;
        obscurer.current.geometry = new CircleGeometry(1.2, 100, 0, 2 * Math.PI - obscurerTheta.current);
      } else if (obscurer.current) {
        scene.remove(obscurer.current);
        obscurer.current = null;
      }
    }

    // focus growths
    const focusComplete = groupRef.current.children.reduce((acc, mesh) => {
      if (mesh.userData.parentGroup) {
        if (mesh.material.userData.shader) {
          if (mesh.userData.parentGroup === focus) {
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
    if (!focus && focusComplete) {
      groupRef.current.children
        .filter((mesh) => mesh.userData.parentGroup)
        .forEach((mesh) => groupRef.current.remove(mesh));
    }

    // hover growths
    const hoversComplete = groupRef.current.children.reduce((acc, mesh) => {
      if (mesh.userData.resource) {
        if (mesh.userData.resource === hovered.current) {
          if (mesh.material.userData.shader.uniforms.uHover.value < 1.0) {
            mesh.material.userData.shader.uniforms.uHover.value += 0.05;
            return false;
          }
        } else if (mesh.material.userData.shader.uniforms.uHover.value > 0.0) {
          mesh.material.userData.shader.uniforms.uHover.value -= 0.05;
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
  
  return (
    <>
      <group ref={groupRef}>
        <mesh />
        <mesh />
        <mesh />
        <mesh />
        <mesh />
      </group>
    </>
  );

  return null;
};

export default AsteroidComposition;