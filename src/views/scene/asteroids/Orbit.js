import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { KeplerianOrbit } from 'influence-utils';

import frag from './orbit/orbit.frag';
import vert from './orbit/orbit.vert';
import constants from '~/constants';
import theme from '~/theme';

const order = new Float32Array(Array(360).fill().map((_, i) => i+1));
const initialUniforms = {
  uCol: { type: 'c', value: new Color(theme.colors.main) },
  uTime: { type: 'i', value: 0 },
  uAlpha: { type: 'f', value: 1.0 },
  uCount: { type: 'f', value: 360 }
};

const Orbit = (props) => {
  const { asteroid } = props;
  const [ positions, setPositions ] = useState(new Float32Array(360 * 3));

  const material = useRef();

  useEffect(() => {
    const keplerianOrbit = new KeplerianOrbit(asteroid.orbital);
    let newPositions = [];
    keplerianOrbit.getSmoothOrbit(360).forEach(p => {
      newPositions.push(...[ p.x, p.y, p.z ].map(v => v * constants.AU));
    });

    setPositions(new Float32Array(newPositions));
  }, [ asteroid ]);

  useFrame(() => {
    const time = material.current.uniforms.uTime.value;
    material.current.uniforms.uTime.value = time + 1;
  });

  return (
    <lineLoop>
      <bufferGeometry>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3 ]} />
        <bufferAttribute attachObject={[ 'attributes', 'order' ]} args={[ order, 1 ]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        args={[{
          depthWrite: false,
          fragmentShader: frag,
          uniforms: initialUniforms,
          transparent: true,
          vertexShader: vert,
        }]} />
    </lineLoop>
  );
};

export default Orbit;
