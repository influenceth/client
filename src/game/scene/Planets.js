import { useRef, useState, useEffect } from 'react';
import { AdditiveBlending } from 'three';
import { useTexture } from '@react-three/drei';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import usePlanets from '~/hooks/usePlanets';
import useStore from '~/hooks/useStore';
import Orbit from './planets/Orbit';
import theme from '~/theme';

const worker = new Worker();

const Planets = (props) => {
  const planets = usePlanets();
  const [ positions, setPositions ] = useState(new Float32Array(5 * 3));
  const time = useStore(s => s.time.current);
  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  const geometry = useRef();

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets.data) {
      worker.postMessage({ topic: 'updatePlanetPositions', planets: planets.data, elapsed: time });
    }
  }, [ planets.data, time ]);

  useEffect(() => {
    if (!!worker) {
      worker.onmessage = (event) => {
        if (event.data.topic === 'planetPositions') setPositions(new Float32Array(event.data.positions));
      };
    }
  }, [])

  // (commented out because not sure this is needed)
  // useLayoutEffect(() => {
  //   if (geometry.current) {
  //     geometry.current.computeBoundingSphere();
  //   }
  // });

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
      {planets.data && planets.data.map((p) => <Orbit key={p.i} planet={p} />)}
    </group>
  )
};

export default Planets;
