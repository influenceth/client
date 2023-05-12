import { useContext, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { KeplerianOrbit } from '@influenceth/sdk';
import { cloneDeep } from 'lodash';

import ClockContext from '~/contexts/ClockContext';
import constants from '~/lib/constants';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import orbitColors from './orbit/orbitColors';
import frag from './orbit/orbit.frag';
import vert from './orbit/orbit.vert';

const solutionPoints = 240;
const initialUniforms = {
  uTime: { type: 'i', value: 0 },
  uAlpha: { type: 'f', value: 1.0 },
  uAlphaMin: { type: 'f', value: 0.05 },
  uCount: { type: 'f', value: solutionPoints + 2 },
  uDash: { type: 'b', value: false }
};

const TravelSolution = ({}) => {
  const { coarseTime } = useContext(ClockContext);

  const uniforms = useRef({
    ...cloneDeep(initialUniforms),
    uCol: { type: 'c', value: new Color(0x000000) },
  });

  const destinationId = useStore(s => s.asteroids.destination);
  const originId = useStore(s => s.asteroids.origin);

  const { data: destination } = useAsteroid(destinationId);
  const { data: origin } = useAsteroid(originId);

  const [order, setOrder] = useState();
  const [prearrival, setPrearrival] = useState();
  const [predeparture, setPredeparture] = useState();
  const [trajectory, setTrajectory] = useState();
  const [trajectoryDebug, setTrajectoryDebug] = useState();

  const travelSolution = useStore(s => s.asteroids.travelSolution);

  useEffect(() => {
    if (!travelSolution || !destination || !origin) {
      setPrearrival();
      setPredeparture();
      setTrajectory();
      setTrajectoryDebug();
      return;
    }

    const { v1, originPosition, destinationPosition, departureTime, arrivalTime } = travelSolution;
    if (!v1 || !originPosition) return;

    const solutionOrbit = KeplerianOrbit.fromStateVectors(
      [originPosition[0], originPosition[1], originPosition[2]],
      v1
    );
    
    const initialAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: originPosition[0],
      y: originPosition[1],
      z: originPosition[2],
    });

    let finalAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: destinationPosition[0],
      y: destinationPosition[1],
      z: destinationPosition[2],
    });
    while (finalAngle < initialAngle) finalAngle += 2 * Math.PI;
    
    const slnIncrement = (finalAngle - initialAngle) / solutionPoints;

    const newPositions = [];
    newPositions.push(...Object.values(originPosition).map((x) => x / constants.AU));
    for (let t = initialAngle; t <= finalAngle; t += slnIncrement) {
      const p = solutionOrbit.getPosByAngle(t);
      newPositions.push(...[ p.x, p.y, p.z ]);
    }
    newPositions.push(...Object.values(destinationPosition).map((x) => x / constants.AU));
    setTrajectory(new Float32Array(newPositions.map((x) => x * constants.AU)));
    setOrder(new Float32Array(Array(newPositions.length).fill().map((_, i) => i + 1)));

    // TODO: comment this out vvv
    let debugPositions = [];
    solutionOrbit.getSmoothOrbit(360).forEach(p => {
      debugPositions.push(...[ p.x, p.y, p.z ].map(v => v * constants.AU));
    });
    setTrajectoryDebug(new Float32Array(debugPositions));
    console.log('solutionOrbit.e', solutionOrbit.e);
    // ^^^

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

    uniforms.current.uCol.value = new Color(travelSolution.invalid ? orbitColors.error : orbitColors.success);
    uniforms.current.uDash.value = !!travelSolution.invalid;

  }, [coarseTime, travelSolution]);

  useFrame(() => {
    uniforms.current.uTime.value++;
  });

  return (
    <>
      {trajectory && (
        <line renderOrder={0} userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ trajectory, 3 ]} />
            <bufferAttribute attachObject={[ 'attributes', 'order' ]} args={[ order, 1 ]} />
          </bufferGeometry>
          <shaderMaterial
            args={[{
              depthWrite: false,
              fragmentShader: frag,
              uniforms: uniforms.current,
              transparent: true,
              vertexShader: vert,
            }]} />
        </line>
      )}
      {false && trajectoryDebug && (
        <line>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ trajectoryDebug, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={orbitColors.white} transparent opacity={0.2} />
        </line>
      )}

      {predeparture && (
        <line>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ predeparture, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={orbitColors.main} />
        </line>
      )}

      {prearrival && (
        <line>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ prearrival, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={travelSolution?.invalid ? orbitColors.error : orbitColors.success} />
        </line>
      )}
    </>
  );
};

export default TravelSolution;


