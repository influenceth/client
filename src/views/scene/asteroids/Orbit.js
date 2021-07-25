import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Vector3 } from 'three';

import frag from './flightLine/flightLine.frag';
import vert from './flightLine/flightLine.vert';
import theme from '~/theme';

const initialUniforms = {
  uCol: { type: 'c', value: new Color(theme.colors.main) },
  uTime: { type: 'i', value: 0 },
  uStart: { type: 'vec3', value: new Vector3() },
  uEnd: { type: 'vec3', value: new Vector3() }
};

const FlightLine = (props) => {
  const { points } = props;
  const [ start, setStart ] = useState(new Float32Array([0, 0, 0]));
  const [ end, setEnd ] = useState(new Vector3(0, 0, 0));
  const [ uniforms, setUniforms ] = useState(initialUniforms);

  const flightGeom = useRef();

  useEffect(() => {
    setStart(new Vector3(...points.slice(0, 3)));
    setEnd(new Vector3(...points.slice(3)));
  }, [ points ]);

  useFrame(() => {
    const time = uniforms.uTime.value;
    setUniforms({
      ...uniforms,
      uTime: {...uniforms.uTime, value: time + 1 },
      uStart: {...uniforms.uStart, value: start },
      uEnd: {...uniforms.uEnd, value: end },
    });
  });

  useLayoutEffect(() => {
    flightGeom.current?.computeBoundingSphere();
  });

  return (
    <line>
      <bufferGeometry ref={flightGeom}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ points, 3 ]} />
      </bufferGeometry>
      <shaderMaterial attach="material" args={[{
        depthWrite: false,
        fragmentShader: frag,
        transparent: true,
        vertexShader: vert,
        uniforms: uniforms
      }]} />
    </line>
  );
};

export default FlightLine;
