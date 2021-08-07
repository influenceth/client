import { useState, useEffect, useRef } from 'react';
import { KeplerianOrbit } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import constants from '~/lib/constants';

const Asteroid = (props) => {
  const origin = useStore(state => state.asteroids.origin);
  const time = useStore(state => state.time.current);
  const { data: asteroidData } = useAsteroid(origin);

  const asteroidGeom = useRef();
  const asteroidOrbit = useRef(null);

  const [ position, setPosition ] = useState([ 0, 0, 0 ]);

  useEffect(() => {
    if (!!asteroidData && !asteroidOrbit.current) asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
    if (!asteroidData) asteroidOrbit.current = null;

    if (asteroidOrbit.current && time) {
      setPosition(Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU));
    }
  }, [ asteroidData, time ]);

  return (
    <group position={position} >
      <mesh>
        <bufferGeometry ref={asteroidGeom} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
};

export default Asteroid;
