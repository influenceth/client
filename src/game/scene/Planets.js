import { useContext, useEffect, useRef } from 'react';
import { AdditiveBlending, Float32BufferAttribute } from 'three';
import { useTexture } from '@react-three/drei';
import { Planet } from '@influenceth/sdk';

import ClockContext from '~/contexts/ClockContext';
import useWebWorker from '~/hooks/useWebWorker';
import useStore from '~/hooks/useStore';
import Orbit from './planets/Orbit';
import theme from '~/theme';

const Planets = () => {
  const planets = Planet.planets;
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const { coarseTime } = useContext(ClockContext);

  const texture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  const { processInBackground } = useWebWorker();

  const geometry = useRef();

  // Listen for changes to planets data or global time and update planet positions
  useEffect(() => {
    if (planets && coarseTime) {
      processInBackground(
        {
          topic: 'updatePlanetPositions',
          planets: {
            key: '_planets',
            orbitals: planets.map(p => p.orbital)
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
  }, [ planets, processInBackground, coarseTime ]);

  return (
    <group position={[ 0, 0, 0 ]} visible={zoomStatus === 'out'}>
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
      {planets.map((p, i) => <Orbit key={i} planet={p.orbital} />)}
    </group>
  )
};

export default Planets;
