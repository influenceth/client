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
  const updateOrigin = useAsteroidsStore(state => state.updateOrigin);
  const destination = useAsteroidsStore(state => state.destination);
  const updateDestination = useAsteroidsStore(state => state.updateDestination);

  const [ positions, setPositions ] = useState();
  const [ radii, setRadii ] = useState();
  const [ flight, setFlight ] = useState(new Float32Array(2 * 3));

  const asteroidsGeom = useRef();

  // Listen for changes to asteroids data or global time and update asteroid positions
  useEffect(() => {
    if (asteroids.data) {
      worker.postMessage({ topic: 'updateAsteroidPositions', asteroids: asteroids.data, elapsed: time });
    }
  }, [ asteroids.data, time ]);

  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useEffect(() => {
    if (asteroids.data && positions) {
      // Updates flight path if an origin and destination are designated
      if (origin && destination) {
        const newFlight = new Float32Array(2 * 3);
        const originKey = asteroids.data.findIndex(a => a.i === origin);
        const destKey = asteroids.data.findIndex(a => a.i === destination);
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
        <points>
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
