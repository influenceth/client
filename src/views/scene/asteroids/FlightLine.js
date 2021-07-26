import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';

import frag from './flightLine/flightLine.frag';
import vert from './flightLine/flightLine.vert';
import theme from '~/theme';

const initialUniforms = {
  uCol: { type: 'c', value: new Color(theme.colors.main) },
  uTime: { type: 'i', value: 0 },
  uStart: { type: 'vec3', value: new Float32Array(3) }
};

const FlightLine = (props) => {
  const { originPos, destinationPos } = props;
  const [ points, setPoints ] = useState(new Float32Array(2 * 3));

  const material = useRef();

  useEffect(() => {
    const newFlight = new Float32Array(2 * 3);
    newFlight.set(originPos);
    newFlight.set(destinationPos, 3);
    setPoints(newFlight);
    material.current.uniforms.uStart.value = originPos;
  }, [ originPos, destinationPos ]);

  useFrame(() => {
    const time = material.current.uniforms.uTime.value;
    material.current.uniforms.uTime.value = time + 1;
  });

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ points, 3 ]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        args={[{
          depthWrite: false,
          fragmentShader: frag,
          transparent: true,
          vertexShader: vert,
          uniforms: initialUniforms
        }]} />
    </line>
  );
};

export default FlightLine;
