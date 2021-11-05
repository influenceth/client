import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { surfaceFiboPoint } from '~/lib/graphics/fiboUtils'

const Building = ({ lot, lotCount, surface, radius }) => {
  const mesh = useRef();

  // TODO: move this into buildings?
  //const position = useMemo(() => heightMapFiboPoint(lot, lotCount, heightMap, config, 1.02), []);
  const position = useMemo(
    () => surfaceFiboPoint(lot, lotCount, surface, radius),
    [lot, lotCount, radius]
  );
  //console.log({ position });

  useEffect(() => {
    if (!!mesh.current && position) {
      mesh.current.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        position.clone().normalize()
      );
    }
  }, [position]);

  return (
    <mesh key={lot} position={position} ref={mesh}>
      <cylinderBufferGeometry
        attach="geometry"
        args={[250, 250, 50, 32]}
      />
      <meshStandardMaterial
        attach="material"
        color={0x0000ff}
        emissiveIntensity={0.4} />
    </mesh>
  );
};

// TODO:
//  - memoization
//  - icon on face of cylinder
//  - shadows
//  - dispose (clean-up)

const Buildings = ({ buildings, lotCount, surface, radius, rotation, rotationAxis }) => {
  const group = useRef();

  const groupReady = !!group.current;
  useEffect(() => {
    if (group.current && rotationAxis) {
      group.current.setRotationFromAxisAngle(rotationAxis, rotation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, groupReady]);

  return (
    <group ref={group}>
      {buildings.map(({ lot }) => (
        <Building
          key={lot}
          lot={lot}
          lotCount={lotCount}
          surface={surface}
          radius={radius} />
      ))}
    </group>
  );
};

export default Buildings;
