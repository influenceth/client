import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { useThrottle } from '@react-hook/throttle';

import { getNearbyFiboPoints } from '~/lib/graphics/fiboUtils';

const NEARBY_LOTS_TO_RENDER = 20;
const MAX_LOTS_TO_RENDER = 40;    // (intended for small asteroids)
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
    if (lotCount <= MAX_LOTS_TO_RENDER) return 5;

    // for math explanation of below, see "arcToSearch" in fiboUtils
    return Math.sqrt(4 * NEARBY_LOTS_TO_RENDER / lotCount);
  }, [lotCount]);

  useEffect(() => {
    if (lotMesh.current) {
      lotMesh.current.setRotationFromAxisAngle(rotationAxis, rotation);
    }
  }, [rotationAxis, rotation]);
  
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
        lotCount <= MAX_LOTS_TO_RENDER ? null : NEARBY_LOTS_TO_RENDER
      );
      while (nearbyFibPoints.length < MAX_LOTS_TO_RENDER) {
        nearbyFibPoints.push(new Vector3(0.0));
      }

      setMouseLotIndex(closestIndex);
      setMouseIntersect(intersection);
      // TODO: should already be normalized?
      setNearMouseLots(nearbyFibPoints);
    } else {
      setMouseLotIndex(null);
      setMouseIntersect(null);
      setNearMouseLots(null);
    }
  }, [lotCount, mousePos, rotation, rotationAxis]);

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
            uNearbyLots: { type: 'v', value: nearMouseLots || nullNearMouseLots }
          },
          vertexShader: `
            varying vec3 vPosition;

            void main() {
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vPosition;

            uniform vec3 uMouse;
            uniform bool uMouseIn;
            uniform float uMouseRadius;
            uniform vec3 uNearbyLots[${MAX_LOTS_TO_RENDER}];

            struct NearbyLot {
              int index;
              float distance;
            };

            void updateClosestLots(inout NearbyLot closest[2], vec3 testPosition) {
              for (int i = 0; i < ${MAX_LOTS_TO_RENDER}; i++) {
                if (length(uNearbyLots[i]) > 0.0) {
                  float testDist = distance(testPosition, uNearbyLots[i]);
                  if (closest[0].distance < 0.0 || testDist < closest[0].distance) {
                    closest[1] = closest[0];
                    closest[0].index = i;
                    closest[0].distance = testDist;
                  } else if (closest[1].distance < 0.0 || testDist < closest[1].distance) {
                    closest[1].index = i;
                    closest[1].distance = testDist;
                  }
                }
              }
            }

            vec4 outlineByClosest(float mDist, vec3 uv) {
              NearbyLot lots[2] = NearbyLot[2](
                NearbyLot(-1, -1.0),
                NearbyLot(-1, -1.0)
              );

              updateClosestLots(lots, uv);
              if (false && lots[0].distance < 0.02) {
                return vec4(1.0);
              }
                
              float minMouseRadius = 0.5 * uMouseRadius;
              float maxMouseRadius = 0.85 * uMouseRadius;

              float alphaMax = 0.8 - (clamp(mDist, minMouseRadius, maxMouseRadius) - minMouseRadius) / (maxMouseRadius - minMouseRadius);

              // if near border between tiles, color as line
              float distanceFromNextLot = lots[1].distance - lots[0].distance;
              if (distanceFromNextLot < 0.015) {
                if (lots[0].index == 0) {
                  return vec4(0.21, 0.65, 0.8, 0.8);
                }
                float fade = min(1.0, pow(68.0 * distanceFromNextLot, 2.0) + 0.3);
                return vec4(0.0, 0.0, 1.0, min(alphaMax, 1.0) * fade);

              // if nearest mouse tile, color as highlighted
              } else if (lots[0].index == 0) {
                return vec4(0.4, 0.4, 1.0, 0.2);
              }

              return vec4(0.0);
            }

            void main() {
              gl_FragColor = vec4(0.0);
              if (uMouseIn) {
                vec3 p = normalize(vPosition);
                vec3 m = normalize(uMouse);
                float mDist = distance(p, m);
                if (mDist < uMouseRadius) {
                  gl_FragColor = outlineByClosest(mDist, p);
                }
              }
            }
          `
      }]} />
    </mesh>
  );
};

export default Lots;
