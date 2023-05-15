import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdalianOrbit } from '@influenceth/sdk';
import { cloneDeep } from 'lodash';

import constants from '~/lib/constants';
import orbitColors from './orbit/orbitColors';
import frag from './orbit/orbit.frag';
import vert from './orbit/orbit.vert';

const order = new Float32Array(Array(360).fill().map((_, i) => i+1));
const initialUniforms = {
  uTime: { type: 'i', value: 0 },
  uAlpha: { type: 'f', value: 1.0 },
  uAlphaMin: { type: 'f', value: 0.5 },
  uCount: { type: 'f', value: 360 },
  uDash: { type: 'b', value: false }
};

const Orbit = ({ asteroid, color, opacityMult = 1, staticOpacity }) => {
  const [ positions, setPositions ] = useState(new Float32Array(360 * 3));

  const uniforms = useRef({
    ...cloneDeep(initialUniforms),
    uCol: { type: 'c', value: orbitColors.main },
  });

  useEffect(() => {
    const orbit = new AdalianOrbit(asteroid.orbital);
    let newPositions = [];
    orbit.getSmoothOrbit(360).forEach(p => {
      newPositions.push(...[ p.x, p.y, p.z ]);
    });

    setPositions(new Float32Array(newPositions));
  }, [ asteroid ]);

  useEffect(() => {
    uniforms.current.uCol.value = (color && orbitColors[color]) || orbitColors.main;
  }, [color]);

  useEffect(() => {
    uniforms.current.uAlpha.value = Math.min(1, initialUniforms.uAlpha.value * opacityMult);
    uniforms.current.uAlphaMin.value = Math.min(1, initialUniforms.uAlphaMin.value * opacityMult);
  }, [opacityMult]);

  useFrame(() => {
    const time = uniforms.current.uTime.value;
    uniforms.current.uTime.value = time + 1;
  });

  return (
    <lineLoop>
      <bufferGeometry>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3 ]} />
        <bufferAttribute attachObject={[ 'attributes', 'order' ]} args={[ order, 1 ]} />
      </bufferGeometry>
      {staticOpacity && (
        <lineBasicMaterial
          color={uniforms.current.uCol.value}
          opacity={staticOpacity}
          transparent />
      )}
      {!staticOpacity && (
        <shaderMaterial
          args={[{
            depthWrite: false,
            fragmentShader: frag,
            uniforms: uniforms.current,
            transparent: true,
            vertexShader: vert,
          }]} />
      )}
    </lineLoop>
  );
};

export default Orbit;
