import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Color, Vector3, Vector4 } from 'three';
import { KeplerianOrbit } from '@influenceth/sdk';

import lambertSolver, { getOrbitalElements, minDeltaVSolver } from '~/lib/lambertSolver';
import theme from '~/theme';
import constants from '~/lib/constants';
import { useMemo } from 'react';

const FlightLine = ({ originOrbital, originPos, destinationOrbital, destinationPos, currentTime }) => {
  const [ points, setPoints ] = useState(new Float32Array(2 * 3));

  const material = useRef();

  const [curvePoints, setCurvePoints] = useState();

  const [originVel, destinationVel] = useMemo(() => {
    const increment = 0.01; // in days
    const originPos1 = new Vector3(originPos[0], originPos[1], originPos[2]);
    const originPos2 = new Vector3(
      ...Object.values((new KeplerianOrbit(originOrbital)).getPositionAtTime(currentTime + increment))
    ).multiplyScalar(constants.AU);
    const originV = new Vector3().subVectors(originPos2, originPos1).divideScalar(increment * 86400);

    const destPos1 = new Vector3(destinationPos[0], destinationPos[1], destinationPos[2]);
    const destPos2 = new Vector3(
      ...Object.values((new KeplerianOrbit(destinationOrbital)).getPositionAtTime(currentTime + increment))
    ).multiplyScalar(constants.AU);
    const destV = new Vector3().subVectors(destPos2, destPos1).divideScalar(increment * 86400);

    return [originV.toArray(), destV.toArray()];
  }, [currentTime, destinationOrbital, originOrbital]);

  const chartBestPath = useCallback(async () => {
    if (!(originPos && destinationPos && originVel && destinationVel)) return;

    const G = 6.6743015e-11; // N m2 / kg2
    const m = 0.86 * 1.98847e30; // kg  // TODO: mass of adalia (and probably gravitational constant should be in sdk)
    const Gm = G * m;
    const travelTime = 86400 * 100;//1000;

    const { v1, deltaV } = await minDeltaVSolver(
      Gm,
      [originPos[0], originPos[1], originPos[2]],
      [destinationPos[0], destinationPos[1], destinationPos[2]],
      travelTime,
      originVel,
      destinationVel
    );
    console.log({ v1, deltaV });

    const orbit = getOrbitalElements(
      Gm,
      [originPos[0], originPos[1], originPos[2]],
      v1
    );
    const keplerianOrbit = new KeplerianOrbit(orbit);

    let newPositions = [];
    keplerianOrbit.getSmoothOrbit(360).forEach(p => {
      newPositions.push(...[ p.x, p.y, p.z ]);
    });
    setCurvePoints(new Float32Array(newPositions));

  }, [originPos, originVel, destinationPos, destinationVel]);

  useEffect(chartBestPath, [chartBestPath]);

  if (!curvePoints) return null;
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ curvePoints, 3 ]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={0xff0000} />
    </line>
  );
};

export default FlightLine;
