import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BackSide,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  Texture,
  Vector2,
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

const noGradient = false;

const AsteroidSpinner = (props) => {
  const { camera, gl, scene, size } = useThree();
  
  const meshRef = useRef();
  const initialTime = useRef(Date.now());

  useEffect(() => {
    console.log([size.width, size.height]);

    // TODO: ring geometry?
    const geometry = new CircleGeometry(1.2, 100);
    const material = new ShaderMaterial({
      side: DoubleSide, // TODO: this can be front probably
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
          float thetaOnStart = mod(-time * 2.0, PI2);
          float thetaOnEnd = thetaOnStart + sin(time * 2.0 - PI);
          
          float tStepOn = step(min(thetaOnStart, thetaOnEnd), theta - thetaOffset);
          float tStepOff = 1.0 - step(max(thetaOnStart, thetaOnEnd), theta - thetaOffset);
          
          float rStepOn = smoothstep(radius, radius + 0.01, r);
          float rStepOff = 1.0 - smoothstep(radius + width, radius + width + 0.01, r);
          return tStepOn * tStepOff * rStepOn * rStepOff;
        }

        void main() {
          vec2 vUv = 2.0 * gl_FragCoord.xy / uResolution.xy - 1.0;
          float r = length(vUv);
          float theta = 2.0 * atan(vUv.y/vUv.x) + PI;
          
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

    gl.render(scene, camera);

    return () => {
      try {
        cleanupScene(scene);
      } catch(e) {
        console.warn(e);
      }
    }
  }, []);

  useFrame(() => {
    if (meshRef.current?.material?.uniforms) {
      meshRef.current.material.uniforms.uResolution.value.x = size.width;
      meshRef.current.material.uniforms.uResolution.value.y = size.height;
      meshRef.current.material.uniforms.uTime.value = (Date.now() - initialTime.current) / 1000;
    }
  });

  return null;
};

export default AsteroidSpinner;