import { useRef, useState, useEffect, useLayoutEffect } from 'react';

import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';
import constants from '~/constants';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useTimeStore from '~/hooks/useTimeStore';
import useAsteroidsStore from '~/hooks/useAsteroidsStore';
import useAsteroids from '~/hooks/useAsteroids';
import FlightLine from './asteroids/FlightLine';

const worker = new Worker();

const Asteroids = (props) => {
  const asteroids = useAsteroids();
  const time = useTimeStore(state => state.time);
  const origin = useAsteroidsStore(state => state.origin);
  const selectOrigin = useAsteroidsStore(state => state.selectOrigin);
  const destination = useAsteroidsStore(state => state.destination);
  const selectDestination = useAsteroidsStore(state => state.selectDestination);

  const [ positions, setPositions ] = useState();
  const [ radii, setRadii ] = useState();
  const [ flight, setFlight ] = useState(new Float32Array(2 * 3));

  const asteroidsGeom = useRef();

  const onClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    selectOrigin(asteroids.data[index].i);
  };

  const onContextClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    selectDestination(asteroids.data[index].i);
  }

  const onMouseOver = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
  };

  const onMouseOut = (e) => {
    e.stopPropagation();
  };

  // When asteroids are newly filtered, or there are changes to origin / destination
  useEffect(() => {
    if (!asteroids.data) return;
    const toProcess = asteroids.data;

    if (origin && !toProcess.some(a => a.i === origin.i)) toProcess.push(origin);
    if (destination && !toProcess.some(a => a.i === destination.i)) toProcess.push(destination);

    worker.postMessage({ topic: 'updateAsteroidsData', asteroids: asteroids.data });
  }, [ asteroids.data, origin, destination ]);

  // Update asteroid positions whenever the time changes in-game
  useEffect(() => {
    if (!asteroids.data) return;
    worker.postMessage({ topic: 'updateAsteroidPositions', elapsed: time });
  }, [ time ]);

  // Receives position updates from the worker
  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useEffect(() => {
    if (asteroids.data && positions) {
      // Updates flight path if an origin and destination are designated
      if (origin && destination) {
        const newFlight = new Float32Array(2 * 3);
        const originKey = asteroids.data.findIndex(a => a.i === origin.i);
        const destKey = asteroids.data.findIndex(a => a.i === destination.i);
        newFlight.set(positions.slice(originKey * 3, originKey * 3 + 3));
        newFlight.set(positions.slice(destKey * 3, destKey * 3 + 3), 3);
        setFlight(newFlight);
      } else {
        setFlight(null);
      }

      // Update asteroid radii attribute to scale point size
      setRadii(new Float32Array(asteroids.data.map(a => a.r)));
    }
  }, [ asteroids.data, positions, origin, destination ]);

  useLayoutEffect(() => {
    asteroidsGeom.current?.computeBoundingSphere();
  });

  return (
    <group>
      {positions && radii && (
        <points
          onClick={onClick}
          onContextMenu={onContextClick}
          onPointerOver={onMouseOver}
          onPointerOut={onMouseOut} >
          <bufferGeometry ref={asteroidsGeom}>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3 ]} />
            <bufferAttribute attachObject={[ 'attributes', 'radius' ]} args={[ radii, 1 ]} />
          </bufferGeometry>
          <shaderMaterial args={[{
            depthWrite: false,
            fragmentShader: frag,
            transparent: true,
            uniforms: {
              uOpacity: { type: 'f', value: 1.0 },
              uMinSize: { type: 'f', value: 2.0 },
              uMaxSize: { type: 'f', value: 3.5 },
              uMinRadius: { type: 'f', value: constants.MIN_ASTEROID_RADIUS },
              uMaxRadius: { type: 'f', value: constants.MAX_ASTEROID_RADIUS }
            },
            vertexColors: true,
            vertexShader: vert
          }]} />
        </points>
      )}
      {flight && <FlightLine points={flight} />}
    </group>
  )
};

export default Asteroids;
