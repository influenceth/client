import { useContext, useEffect, useRef } from 'react';
import { AdditiveBlending, Float32BufferAttribute } from 'three';
import { useTexture } from '@react-three/drei';

import ClockContext from '~/contexts/ClockContext';
import usePlanets from '~/hooks/usePlanets';
import useWebWorker from '~/hooks/useWebWorker';
import Orbit from './planets/Orbit';
import theme from '~/theme';

const Planets = () => {
  const planets = usePlanets();
  const { coarseTime } = useContext(ClockContext);

  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  const { processInBackground } = useWebWorker();
  
  const geometry = useRef();

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets.data && coarseTime) {
      processInBackground(
        {
          topic: 'updatePlanetPositions',
          planets: {
            key: '_planets',
            orbitals: planets.data.map((p) => p.orbital)
          },
          elapsed: coarseTime,
          _cacheable: 'planets'
        },
        (data) => {
          if (geometry.current && data.positions) {
            geometry.current.setAttribute(
              'position',
              new Float32BufferAttribute(data.positions, 3)
            );
            geometry.current.computeBoundingSphere();
          }
        }
      );
    }
  }, [ planets.data, processInBackground, coarseTime ]);

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
