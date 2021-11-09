import { useEffect, useMemo, useRef } from 'react';
import {
  MeshStandardMaterial,
  Quaternion,
  //TextureLoader,
  Vector3 } from 'three';

//import logo from "~/assets/images/silhouette.png";
import { surfaceFiboPoint } from '~/lib/graphics/fiboUtils'

const BUILDING_HEIGHT = 150;

// TODO (enhancement): cast shadows from buildings

const Building = ({ lot, lotCount, surface, radius, rotation, rotationAxis }) => {

  const position = useMemo(
    () => {
      if (lotCount && radius && surface) {
        const buildingPosition = surfaceFiboPoint(lot, lotCount, surface, radius, rotation, rotationAxis);
        if (buildingPosition) {
          buildingPosition.setLength(buildingPosition.length() + BUILDING_HEIGHT);
          return buildingPosition;
        }
      }
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lot, lotCount, radius]
  );

  const quaternion = useMemo(
    () => {
      if (position) {
        const q = new Quaternion();
        q.setFromUnitVectors(
          new Vector3(0, 1, 0),
          position.clone().normalize()
        );
        return q;
      }
      return null;
    },
    [position]
  );

  const materials = useMemo(() => {
    const defaultParams = {
      color: 0x0000ff,
      emissive: 0x0000ff,
      emissiveIntensity: 0.1,
      //opacity: 0.6,
      //transparent: true
    };

    return [
      new MeshStandardMaterial(defaultParams),
      new MeshStandardMaterial({
        ...defaultParams,
        //map: new TextureLoader().load(logo),
      }),
      new MeshStandardMaterial(defaultParams),
    ];
  }, []);

  const cylinderPosition = useMemo(() => position && position.clone().multiplyScalar(0.5), [position]);
  const cylinderGeometry = useMemo(() => position && [250, 250, position.length(), 32], [position]);
  
  if (!position || !quaternion) return null;
  return (
    <mesh
      key={lot}
      material={materials}
      position={cylinderPosition}
      quaternion={quaternion}>
      <cylinderBufferGeometry attach="geometry" args={cylinderGeometry} />
    </mesh>
  );
};

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
          radius={radius}
          rotation={rotation}
          rotationAxis={rotationAxis} />
      ))}
    </group>
  );
};

export default Buildings;
