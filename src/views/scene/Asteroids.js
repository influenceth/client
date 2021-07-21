import { useRef, useLayoutEffect } from 'react';

import constants from '~/constants';
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
    positions = new Float32Array(flatData);
  }

  const geometry = useRef();

  useLayoutEffect(() => {
    geometry.current?.computeBoundingSphere();
  });

  return (
    <points>
      <bufferGeometry ref={geometry} attach="geometry">
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <pointsMaterial attach="material" color="white" sizeAttenuation={false} size={2} />
    </points>
  )
};

export default Asteroids;
