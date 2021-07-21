import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { AdditiveBlending } from 'three';
import { useTexture } from '@react-three/drei';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import constants from '~/constants';
import usePlanets from '~/hooks/usePlanets';
import useStore from '~/hooks/useStore';

const worker = new Worker();

const Planets = (props) => {
  const planets = usePlanets();
  const [ positions, setPositions ] = useState(new Float32Array(5 * 3));
  const adaliaTime = useStore(state => state.adaliaTime);
  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/planet.png`);
  const geometry = useRef();

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets.data) {
      worker.postMessage({ topic: 'updatePlanetPositions', planets: planets.data, elapsed: adaliaTime });
    }
  }, [ planets.data, adaliaTime ]);

  worker.onmessage = (event) => {
    if (event.data.topic === 'planetPositions') setPositions(new Float32Array(event.data.positions));
  };

  useLayoutEffect(() => {
    geometry.current?.computeBoundingSphere();
  });

  return (
    <points>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={AdditiveBlending}
        color="white"
        map={texture}
        size={6}
        sizeAttenuation={false}
        transparent={true} />
    </points>
  )
};

export default Planets;
