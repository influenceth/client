import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { AdditiveBlending } from 'three';
import { useTexture } from '@react-three/drei';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import usePlanets from '~/hooks/usePlanets';
import useTimeStore from '~/hooks/useTimeStore';
import Orbit from './planets/Orbit';
import theme from '~/theme';

const worker = new Worker();

const Planets = (props) => {
  const planets = usePlanets();
  const [ positions, setPositions ] = useState(new Float32Array(5 * 3));
  const adaliaTime = useTimeStore(state => state.adaliaTime);
  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
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
    <group position={[ 0, 0, 0 ]}>
      <points>
        <bufferGeometry ref={geometry}>
          <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          blending={AdditiveBlending}
          color={theme.colors.main}
          map={texture}
          size={6}
          sizeAttenuation={false}
          transparent={true} />
      </points>
      {planets.data && planets.data.map((p, i) => {
        return (<Orbit key={i} planet={p} />);
      })}
    </group>
  )
};

export default Planets;
