import { useEffect, useMemo, useRef } from 'react';
import { AdalianOrbit } from '@influenceth/sdk';

import constants from '~/lib/constants';
import theme from '~/theme';
import useStore from '~/hooks/useStore';

const Orbit = (props) => {
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const geometry = useRef();

  const positions = useMemo(() => {
    const vertices = [];
    const orbit = new AdalianOrbit(props.planet.orbital);
    orbit.getSmoothOrbit(360).forEach(p => {
      vertices.push(...[ p.x, p.y, p.z ]);//.map(v => v * constants.AU))
    });

    return new Float32Array(vertices);
  }, [props.planet.orbital]);

  // re-computeBoundingSphere on geometry change
  useEffect(() => {
    if (geometry.current) {
      geometry.current.computeBoundingSphere();
    }
  }, [positions]);

  return (
    <lineLoop>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={theme.colors.main}
        depthWrite={false}
        opacity={zoomStatus === 'out' ? 0.3 : 0.15}
        transparent={true} />
    </lineLoop>
  );
};

export default Orbit;
