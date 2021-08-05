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
  const time = useStore(state => state.time.current);
  const originId = useStore(state => state.asteroids.origin);
  const destinationId = useStore(state => state.asteroids.destination);
  const hovered = useStore(state => state.asteroids.hovered);
  const routePlannerActive = useStore(state => state.outliner.routePlanner.active);

  const { data: asteroids } = useAsteroids();
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const dispatchOriginSelected = useStore(state => state.dispatchOriginSelected);
  const dispatchOriginCleared = useStore(state => state.dispatchOriginCleared);
  const dispatchDestinationSelected = useStore(state => state.dispatchDestinationSelected);
  const dispatchAsteroidHovered = useStore(state => state.dispatchAsteroidHovered);
  const dispatchAsteroidUnhovered = useStore(state => state.dispatchAsteroidUnhovered);

  const [ mappedAsteroids, setMappedAsteroids ] = useState([]);
  const [ positions, setPositions ] = useState(new Float32Array());
  const [ radii, setRadii ] = useState(new Float32Array());
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();

  const asteroidsGeom = useRef();

  const onClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    dispatchOriginSelected(asteroids[index].i);
  };

  const onContextClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (asteroids[index].i === originId) dispatchOriginCleared();
    if (!routePlannerActive) return; // Only allow picking a destination if the route planner is open
    dispatchDestinationSelected(asteroids[index].i);
  }

  const onMouseOver = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    const id = asteroids[index].i;
    dispatchAsteroidHovered(id);
  };

  const onMouseOut = (e) => {
    e.stopPropagation();
    dispatchAsteroidUnhovered();
  };

  // Update state when asteroids from server, origin, or destination change
  useEffect(() => {
    const newMappedAsteroids = !!asteroids ? asteroids.slice() : [];

    if (!!origin && !newMappedAsteroids.some(a => a.i === origin.i)) {
      newMappedAsteroids.push(Object.assign({}, origin));
    }

    if (!!destination && !newMappedAsteroids.some(a => a.i === destination.i)) {
      newMappedAsteroids.push(Object.assign({}, destination));
    }

    setMappedAsteroids(newMappedAsteroids);
  }, [ asteroids, origin, destination ]);

  // Responds to hover changes in the store which could be fired from the HUD
  useEffect(() => {
    if (!hovered || hovered === originId || hovered === destinationId) {
      setHoveredPos(null);
      return;
    }

    if (mappedAsteroids.length * 3 === positions.length) {
      const index = mappedAsteroids.findIndex(a => a.i === hovered);

      if (index > -1) {
        const pos = positions.slice(index * 3, index * 3 + 3);
        setHoveredPos(pos);
      } else {
        setHoveredPos(null);
      }
    }
  }, [ hovered, originId, destinationId, positions, mappedAsteroids ]);

  // When asteroids are newly filtered, or there are changes to origin / destination
  useEffect(() => {
    worker.postMessage({ topic: 'updateAsteroidsData', asteroids: mappedAsteroids, elapsed: time });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ mappedAsteroids ]);

  // Update asteroid positions whenever the time changes in-game
  useEffect(() => {
    worker.postMessage({ topic: 'updateAsteroidPositions', elapsed: time });
  }, [ time ]);

  // Receives position updates from the worker
  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useEffect(() => {
    // Check that we have data, positions are processed, and they're in sync
    if (mappedAsteroids.length * 3 === positions.length) {
      if (originId) {
        const originKey = mappedAsteroids.findIndex(a => a.i === originId);
        setOriginPos(positions.slice(originKey * 3, originKey * 3 + 3));
      } else {
        setOriginPos(null);
      }

      if (destinationId) {
        const destKey = mappedAsteroids.findIndex(a => a.i === destinationId);
        setDestinationPos(positions.slice(destKey * 3, destKey * 3 + 3));
      } else {
        setDestinationPos(null);
      }

      // Update asteroid radii attribute to scale point size
      setRadii(new Float32Array(mappedAsteroids.map(a => a.r)));
    }
  }, [ mappedAsteroids, positions, originId, destinationId ]);

  useLayoutEffect(() => {
    asteroidsGeom.current?.computeBoundingSphere();
  });

  return (
    <group>
      {positions?.length > 0 && !!radii && (
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
      {!!origin && <Orbit asteroid={origin} />}
      {!!destination && <Orbit asteroid={destination} />}
      {originPos && destinationPos && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
    </group>
  )
};

export default Asteroids;
