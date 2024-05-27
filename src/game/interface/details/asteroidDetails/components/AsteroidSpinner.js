import { useEffect, useMemo, useRef } from 'react';
import {
  CircleGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { cleanupScene } from '~/game/scene/asteroid/helpers/utils';

const AsteroidSpinner = () => {
  const { camera, gl, scene, size, ...props } = useThree();
  
  const meshRef = useRef();
  const initialTime = useRef(Date.now());

  const pixelDensity = useMemo(() => {
    return gl.getPixelRatio() || 1;   // or viewport.dpr?
  }, []);

  useEffect(() => {
    const geometry = new CircleGeometry(1.2, 120);
    const material = new ShaderMaterial({
      transparent: true,
      uniforms: {
        uResolution: { type: 'v2', value: new Vector2(size.width, size.height) },
        uTime: { type: 'f', value: 0.0 },
      },
      fragmentShader: `
        #define PI 3.141592653589793
        #define PI2 6.283185307179586

        uniform vec2 uResolution;
        uniform float uTime;

        float spinner(float r, float theta, float radius, float width, float timeOffset, float thetaOffset) {
          float time = uTime - timeOffset;
          float thetaOnStart = mod(-2.0 * time, PI2);
          float thetaOnEnd = thetaOnStart + sin(2.0 * time - PI);
          
          float tStepOn = step(min(thetaOnStart, thetaOnEnd), theta - thetaOffset);
          float tStepOff = 1.0 - step(max(thetaOnStart, thetaOnEnd), theta - thetaOffset);
          
          float rStepOn = smoothstep(radius, radius + 0.01, r);
          float rStepOff = 1.0 - smoothstep(radius + width, radius + width + 0.01, r);
          return tStepOn * tStepOff * rStepOn * rStepOff;
        }

        void main() {
          vec2 vUv = 2.0 * gl_FragCoord.xy / uResolution.xy - 1.0;
          float r = length(vUv);
          float theta = 2.0 * atan(vUv.y / vUv.x) + PI;
          
          vec3 blue = vec3(0.20784313725490197, 0.5176470588235295, 0.6313725490196078);
          vec3 col = (1.0 - step(0.7, r)) * vec3(0.058823529411764705, 0.1568627450980392, 0.19215686274509805);
          
          float spinner1 = spinner(r, theta, 0.665, 0.025, 0.0, 0.0);
          float spinner2 = spinner(r, theta, 0.735, 0.025, 1.0, -0.25 * PI);
          col += blue * spinner1;
          col += blue * spinner2;
          
          float sinx = sin(2.5 * uTime);
          float dist = 0.46 + 0.1 * sign(sinx) * sinx;
          float white = 0.3 * step(dist, r) * (1.0 - step(dist + 0.28, r)) * (1.0 - 2.5 * (r - (dist - 0.25)));
          white *= 1.0 - max(max(spinner1, spinner2), 0.0); // don't brighten spinner
          col += vec3(white, white, white);
          
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    meshRef.current = new Mesh(geometry, material);
    scene.add(meshRef.current);

    camera.position.set(0, 0, 1.4);
    camera.updateProjectionMatrix();

    return () => {
      try {
        cleanupScene(scene);
      } catch(e) {
        console.warn(e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (meshRef.current?.material?.uniforms) {
      meshRef.current.material.uniforms.uResolution.value.x = size.width * pixelDensity;
      meshRef.current.material.uniforms.uResolution.value.y = size.height * pixelDensity;
      meshRef.current.material.uniforms.uTime.value = (Date.now() - initialTime.current) / 1000;
    }
  });

  return null;
};

const AsteroidSpinnerInCanvas = () => (
  <Canvas frameloop="always" linear>
    <AsteroidSpinner />
  </Canvas>
);

export default AsteroidSpinnerInCanvas;