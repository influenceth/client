import { Suspense, useRef, useState, useEffect, useLayoutEffect } from 'react';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroids from '~/hooks/useAsteroids';
import useAsteroid from '~/hooks/useAsteroid';
import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';
import constants from '~/constants';

const worker = new Worker();

const Asteroids = (props) => {
  const asteroids = useAsteroids();
  const time = useStore(state => state.time.current);
  const originId = useStore(state => state.asteroids.origin);
  const origin = useAsteroid(originId);
  const dispatchOriginSelected = useStore(state => state.dispatchOriginSelected);
  const dispatchOriginCleared = useStore(state => state.dispatchOriginCleared);
  const destinationId = useStore(state => state.asteroids.destination);
  const destination = useAsteroid(destinationId);
  const dispatchDestinationSelected = useStore(state => state.dispatchDestinationSelected);
  const hovered = useStore(state => state.asteroids.hovered);
  const dispatchAsteroidHovered = useStore(state => state.dispatchAsteroidHovered);
  const dispatchAsteroidUnhovered = useStore(state => state.dispatchAsteroidUnhovered);
  const routePlannerActive = useStore(state => state.outliner.routePlanner.active);

  const [ positions, setPositions ] = useState();
  const [ radii, setRadii ] = useState();
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();

  const asteroidsGeom = useRef();

  const onClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    dispatchOriginSelected(asteroids.data[index].i);
  };

  const onContextClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (asteroids.data[index].i === originId) dispatchOriginCleared();
    if (!routePlannerActive) return; // Only allow picking a destination if the route planner is open
    dispatchDestinationSelected(asteroids.data[index].i);
  }

  const onMouseOver = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    const id = asteroids.data[index].i;
    dispatchAsteroidHovered(id);
  };

  const onMouseOut = (e) => {
    e.stopPropagation();
    dispatchAsteroidUnhovered();
  };

  // Responds to hover changes in the store which could be fired from the HUD
  useEffect(() => {
    if (!hovered || hovered === originId || hovered === destinationId) {
      setHoveredPos(null);
      return;
    }

    if (asteroids.data && positions && asteroids.data.length * 3 === positions.length) {
      const index = asteroids.data?.findIndex(a => a.i === hovered);

      if (index > -1) {
        const pos = positions.slice(index * 3, index * 3 + 3);
        setHoveredPos(pos);
      } else {
        setHoveredPos(null);
      }
    }
  }, [ hovered, originId, destinationId, positions, asteroids.data ]);

  // When asteroids are newly filtered, or there are changes to origin / destination
  useEffect(() => {
    if (!asteroids.data) return;
    const toProcess = asteroids.data;

    if (origin.data && !toProcess.some(a => a.i === origin.data.i)) toProcess.push(origin.data);
    if (destination.data && !toProcess.some(a => a.i === destination.data.i)) toProcess.push(destination.data);

    worker.postMessage({ topic: 'updateAsteroidsData', asteroids: asteroids.data });
  }, [ asteroids.data, origin.data, destination.data, destination ]);

  // Update asteroid positions whenever the time changes in-game
  useEffect(() => {
    if (!asteroids.data) return;
    worker.postMessage({ topic: 'updateAsteroidPositions', elapsed: time });
  }, [ time, asteroids.data ]);

  // Receives position updates from the worker
  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useEffect(() => {
    // Check that we have data, positions are processed, and they're in sync
    if (asteroids.data && positions && asteroids.data.length * 3 === positions.length) {
      if (origin.data) {
        const originKey = asteroids.data.findIndex(a => a.i === originId);
        setOriginPos(positions.slice(originKey * 3, originKey * 3 + 3));
      } else {
        setOriginPos(null);
      }

      if (destinationId) {
        const destKey = asteroids.data.findIndex(a => a.i === destinationId);
        setDestinationPos(positions.slice(destKey * 3, destKey * 3 + 3));
      } else {
        setDestinationPos(null);
      }

      // Update asteroid radii attribute to scale point size
      setRadii(new Float32Array(asteroids.data.map(a => a.r)));
    }
  }, [ asteroids.data, positions, originId, destinationId ]);

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
      <Suspense fallback={<group />}>
        {hoveredPos && <Marker asteroidPos={hoveredPos} />}
        {originPos && <Marker asteroidPos={originPos} />}
        {destinationPos && <Marker asteroidPos={destinationPos} />}
      </Suspense>
      {origin.data && <Orbit asteroid={origin.data} />}
      {destination.data && <Orbit asteroid={destination.data} />}
      {originPos && destinationPos && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
    </group>
  )
};

export default Asteroids;
