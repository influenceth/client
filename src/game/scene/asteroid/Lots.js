import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { useThrottle } from '@react-hook/throttle';

import { getNearbyFiboPoints } from '~/lib/graphics/fiboUtils';
import lotShader from './lots.glsl';
import lotVertexShader from './lots.vert';

// NOTE: if change MAX_LOTS_TO_RENDER, also update two references in lots.glsl
const MAX_LOTS_TO_RENDER = 40; 
const TARGET_LOTS_TO_RENDER = 20;
const nullNearMouseLots = Array.from(Array(MAX_LOTS_TO_RENDER)).map(() => new Vector3(0.0));

const Lots = ({ geometry, radius, rotation, rotationAxis }) => {
  const lotMesh = useRef();

  // TODO (enhancement): should decrease throttle rate until
  //  mouse movement no longer seems smooth
  const [ mousePos, setMousePos ] = useThrottle(null, 30);
  const [ mouseLotIndex, setMouseLotIndex ] = useState();
  const [ mouseIntersect, setMouseIntersect ] = useState();
  const [ nearMouseLots, setNearMouseLots ] = useState();

  const lotCount = useMemo(() => {
    return Math.floor(4 * Math.PI * radius * radius / 1e6);
  }, [radius]);

  const mouseRadius = useMemo(() => {
    // if total lot count < max lots to render, going to show all with full opacity
    // (100 is an arbitrarily large number w/r/t unit sphere radius)
    if (lotCount <= MAX_LOTS_TO_RENDER) return 100;

    // for math explanation of below, see "arcToSearch" in fiboUtils
    return Math.sqrt(4 * TARGET_LOTS_TO_RENDER / lotCount);
  }, [lotCount]);

  const meshReady = !!lotMesh.current;
  useEffect(() => {
    if (lotMesh.current && rotationAxis) {
      lotMesh.current.setRotationFromAxisAngle(rotationAxis, rotation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, meshReady]);
  
  useEffect(() => {
    if (mousePos && mousePos.intersections?.length > 0) {
      var intersection = new Vector3();
      intersection.copy(mousePos.intersections[0].point);
      intersection.applyAxisAngle(rotationAxis, -1 * rotation);

      // TODO (enhancement): could potentially optimize this further by returning the
      //  edges of nearbyFibPoints[0] and not recalculating nearbyFibPoints again until
      //  mouse breaks out of those boundaries
      const { closestIndex, points: nearbyFibPoints } = getNearbyFiboPoints(
        intersection.normalize(),
        lotCount,
        lotCount <= MAX_LOTS_TO_RENDER ? null : TARGET_LOTS_TO_RENDER
      );
      while (nearbyFibPoints.length < MAX_LOTS_TO_RENDER) {
        nearbyFibPoints.push(new Vector3(0.0));
      }

      setMouseLotIndex(closestIndex);
      setMouseIntersect(intersection);
      setNearMouseLots(nearbyFibPoints);
    } else if (mouseLotIndex || mouseIntersect || nearMouseLots) {
      setMouseLotIndex(null);
      setMouseIntersect(null);
      setNearMouseLots(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotCount, mousePos]);

  const handleClick = useCallback(() => {
    window.alert(`clicked ${mouseLotIndex}`);
  }, [mouseLotIndex]);

  if (!geometry) return null;
  return (
    <mesh
      ref={lotMesh}
      onClick={handleClick}
      onPointerMove={setMousePos}
      onPointerOut={setMousePos}
      scale={1.01}>
      <primitive attach="geometry" object={geometry} />
      <shaderMaterial attach="material" args={[{
          transparent: true,
          uniforms: {
            uMouse: { type: 'v', value: mouseIntersect || new Vector3(0.0) },
            uMouseIn: { type: 'b', value: !!mouseIntersect },
            uMouseRadius: { type: 'f', value: mouseRadius },
            uNearbyLots: { type: 'v', value: nearMouseLots || nullNearMouseLots },
            uRadius: { type: 'f', value: radius}
          },
          vertexShader: lotVertexShader,
          fragmentShader: lotShader
      }]} />
    </mesh>
  );
};

export default Lots;
