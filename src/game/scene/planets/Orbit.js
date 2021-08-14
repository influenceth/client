import { useRef, useLayoutEffect } from 'react';
import { KeplerianOrbit } from 'influence-utils';

import constants from '~/lib/constants';
import theme from '~/theme';

const Orbit = (props) => {
  const geometry = useRef();
  const keplerianOrbit = new KeplerianOrbit(props.planet.orbital);
  const vertices = [];
  keplerianOrbit.getSmoothOrbit(360).forEach(p => {
    vertices.push(...[ p.x, p.y, p.z ].map(v => v * constants.AU))
  });

  const positions = new Float32Array(vertices);

  useLayoutEffect(() => {
    geometry.current?.computeBoundingSphere();
  });

  return (
    <lineLoop>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={theme.colors.main}
        depthWrite={false}
        opacity={0.3}
        transparent={true} />
    </lineLoop>
  );
};

export default Orbit;
