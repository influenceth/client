import { useRef, useEffect } from 'react';
import { AdditiveBlending, Float32BufferAttribute } from 'three';
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
  const time = useStore(s => s.time.current);
  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  
  const geometry = useRef();

  useEffect(() => {
    worker.onmessage = (event) => {
      if (event.data.topic === 'planetPositions') {
        geometry.current.setAttribute(
          'position',
          new Float32BufferAttribute(event.data.positions, 3)
        );
        geometry.current.computeBoundingSphere();
      }
    };
  }, []);

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets.data) {
      worker.postMessage({ topic: 'updatePlanetPositions', planets: planets.data, elapsed: time });
    }
  }, [ planets.data, time ]);

  return (
    <group position={[ 0, 0, 0 ]}>
      <points>
        <bufferGeometry ref={geometry} />
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
