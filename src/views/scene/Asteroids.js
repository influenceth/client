import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import constants from '~/constants';
import useStore from '~/hooks/useStore';
import useAsteroids from '~/hooks/useAsteroids';

const worker = new Worker();

const Asteroids = (props) => {
  const asteroids = useAsteroids();
  const [ positions, setPositions ] = useState(new Float32Array(2500 * 3));
  const adaliaTime = useStore(state => state.adaliaTime);
  const geometry = useRef();

  // Listen for changes to asteroids data or global time and update asteroid positions
  useEffect(() => {
    if (asteroids.data) {
      worker.postMessage({ topic: 'updateAsteroidPositions', asteroids: asteroids.data, elapsed: adaliaTime });
    }
  }, [ asteroids.data, adaliaTime ]);

  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useLayoutEffect(() => {
    geometry.current?.computeBoundingSphere();
  });

  return (
    <points>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="white" sizeAttenuation={false} size={2} />
    </points>
  )
};

export default Asteroids;
