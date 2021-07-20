import { useRef, useLayoutEffect } from 'react';

import constants from '~/config/constants';
import useAsteroids from '~/hooks/useAsteroids';

const Asteroids = (props) => {
  const asteroids = useAsteroids();
  let positions = new Float32Array(2500 * 3);
  let data, flatData;

  if (asteroids.data) {
    data = asteroids.data.map((a) => {
      return [ a.p.x * constants.AU, a.p.y * constants.AU, a.p.z * constants.AU ];
    });

    flatData = [].concat.apply([], data);
    positions = Array(2500 * 3).fill(0);
    positions.splice(0, flatData.length, ...flatData);
    positions = new Float32Array(positions);
  }

  const geometry = useRef();

  useLayoutEffect(() => {
    geometry.current?.computeBoundingSphere();
  });

  return (
    <points
      onContextMenu={(e) => console.log('context menu')}
      onClick={(e) => console.log('click')}
      onDoubleClick={(e) => console.log('double click')}
      onPointerOver={(e) => console.log('over')}
      onPointerOut={(e) => console.log('out')}>
      <bufferGeometry ref={geometry} attach="geometry">
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <pointsMaterial attach="material" color="white" sizeAttenuation={false} size={2} />
    </points>
  )
};

export default Asteroids;
