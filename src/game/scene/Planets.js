import { useRef, useEffect } from 'react';
import { AdditiveBlending, Float32BufferAttribute } from 'three';
import { useTexture } from '@react-three/drei';

import usePlanets from '~/hooks/usePlanets';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import Orbit from './planets/Orbit';
import theme from '~/theme';

const Planets = (props) => {
  const planets = usePlanets();
  const time = useStore(s => s.time.current);
  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  const { processInBackground } = useWebWorker();
  
  const geometry = useRef();

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets.data && time) {
      processInBackground(
        { topic: 'updatePlanetPositions', planets: planets.data, elapsed: time },
        (data) => {
          geometry.current.setAttribute(
            'position',
            new Float32BufferAttribute(data.positions, 3)
          );
          geometry.current.computeBoundingSphere();
        }
      );
    }
  }, [ planets.data, processInBackground, time ]);

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
