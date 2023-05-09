import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { KeplerianOrbit } from '@influenceth/sdk';

import frag from './orbit/orbit.frag';
import vert from './orbit/orbit.vert';
import constants from '~/lib/constants';
import theme from '~/theme';

const order = new Float32Array(Array(360).fill().map((_, i) => i+1));
const initialUniforms = {
  uTime: { type: 'i', value: 0 },
  uAlpha: { type: 'f', value: 1.0 },
  uAlphaMin: { type: 'f', value: 0.5 },
  uCount: { type: 'f', value: 360 }
};

const Orbit = ({ asteroid, color }) => {
  const [ positions, setPositions ] = useState(new Float32Array(360 * 3));

  const uniforms = useRef({
    ...initialUniforms,
    uCol: { type: 'c', value: new Color(color || theme.colors.main) },
  });

  useEffect(() => {
    const keplerianOrbit = new KeplerianOrbit(asteroid.orbital);
    let newPositions = [];
    keplerianOrbit.getSmoothOrbit(360).forEach(p => {
      newPositions.push(...[ p.x, p.y, p.z ].map(v => v * constants.AU));
    });

    setPositions(new Float32Array(newPositions));
  }, [ asteroid ]);

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
      <shaderMaterial
        args={[{
          depthWrite: false,
          fragmentShader: frag,
          uniforms: uniforms.current,
          transparent: true,
          vertexShader: vert,
        }]} />
    </lineLoop>
  );
};

export default Orbit;
