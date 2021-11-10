import { useMemo, useRef } from 'react';
import { KeplerianOrbit } from 'influence-utils';

import constants from '~/lib/constants';
import theme from '~/theme';

const Orbit = (props) => {
  const geometry = useRef();

  const positions = useMemo(() => {
    const vertices = [];
    const keplerianOrbit = new KeplerianOrbit(props.planet.orbital);
    keplerianOrbit.getSmoothOrbit(360).forEach(p => {
      vertices.push(...[ p.x, p.y, p.z ].map(v => v * constants.AU))
    });

    return new Float32Array(vertices);
  }, [props.planet.orbital]);

  // (commented out because not sure this is needed)
  // useLayoutEffect(() => {
  //   if (geometry.current) {
  //     geometry.current.computeBoundingSphere();
  //   }
  // });

  return (
    <lineLoop>
      <bufferGeometry ref={geometry}>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={theme.colors.main}
        depthWrite={false}
        opacity={0.3}
        transparent={true} />
    </lineLoop>
  );
};

export default Orbit;
