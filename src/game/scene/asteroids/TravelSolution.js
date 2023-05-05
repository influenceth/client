import { useContext, useEffect, useState } from 'react';
import { Vector3 } from 'three';
import { KeplerianOrbit } from '@influenceth/sdk';

import ClockContext from '~/contexts/ClockContext';
import constants from '~/lib/constants';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';

const TravelSolution = ({}) => {
  const { coarseTime } = useContext(ClockContext);

  const destinationId = useStore(s => s.asteroids.destination);
  const originId = useStore(s => s.asteroids.origin);

  const { data: destination } = useAsteroid(destinationId);
  const { data: origin } = useAsteroid(originId);

  const [prearrival, setPrearrival] = useState();
  const [predeparture, setPredeparture] = useState();
  const [trajectory, setTrajectory] = useState();

  const travelSolution = useStore(s => s.asteroids.travelSolution);

  useEffect(() => {
    if (!travelSolution || !destination || !origin) {
      setPrearrival();
      setPredeparture();
      setTrajectory();
      return;
    }

    const { v1, originPosition, destinationPosition, departureTime, arrivalTime } = travelSolution;
    if (!v1 || !originPosition) return;

    const solutionOrbit = KeplerianOrbit.fromPositionAndVelocity(
      [originPosition[0], originPosition[1], originPosition[2]],
      v1
    );
    
    const initialAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: originPosition[0],
      y: originPosition[1],
      z: originPosition[2],
    });

    const finalAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: destinationPosition[0],
      y: destinationPosition[1],
      z: destinationPosition[2],
    });
    
    const slnIncrement = (finalAngle - initialAngle) / 100;

    let newPositions = [];
    newPositions.push(...Object.values(originPosition).map((x) => x / constants.AU));
    for (let t = initialAngle; t <= finalAngle; t += slnIncrement) {
      const p = solutionOrbit.getPosByAngle(t);
      newPositions.push(...[ p.x, p.y, p.z ]);
    }
    newPositions.push(...Object.values(destinationPosition).map((x) => x / constants.AU));

    setTrajectory(new Float32Array(newPositions.map((x) => x * constants.AU)));


    // departureTime: baseTime + delay,
    // arrivalTime: baseTime + delay + tof,

    const originPositions = [];
    const originOrbit = new KeplerianOrbit(origin.orbital);
    const originIncrement = (departureTime - coarseTime) / 360;
    for (let t = coarseTime; t < departureTime; t += originIncrement) {
      const p = originOrbit.getPositionAtTime(t);
      originPositions.push(...[ p.x, p.y, p.z ]);
    }
    setPredeparture(new Float32Array(originPositions.map((x) => x * constants.AU)));

    const destinationPositions = [];
    const destinationOrbit = new KeplerianOrbit(destination.orbital);
    const destinationIncrement = (arrivalTime - coarseTime) / 360;
    for (let t = coarseTime; t < arrivalTime; t += destinationIncrement) {
      const p = destinationOrbit.getPositionAtTime(t);
      destinationPositions.push(...[ p.x, p.y, p.z ]);
    }
    setPrearrival(new Float32Array(destinationPositions.map((x) => x * constants.AU)));

  }, [coarseTime, travelSolution]);



  // TODO: originDelay curve
  // TODO: originDelay marker
  // TODO: destination arrival curve
  // TODO: arrival marker



  return (
    <>
      {trajectory && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ trajectory, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0xffff00} />
        </line>
      )}

      {predeparture && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ predeparture, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0x72c1dc} />
        </line>
      )}

      {prearrival && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ prearrival, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0xff5555} />
        </line>
      )}

      {false && (
        <mesh position={new Vector3(travelSolution.destinationPosition[0], travelSolution.destinationPosition[1], travelSolution.destinationPosition[2])}>
          <sphereGeometry args={[3e9]} />
          <meshBasicMaterial color={0x00ff00} transparent opacity={0.5} />
        </mesh>
      )}
    </>
  );
};

export default TravelSolution;


