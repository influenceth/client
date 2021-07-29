import { useRef, useState, useEffect, useLayoutEffect } from 'react';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useTimeStore from '~/hooks/useTimeStore';
import useAsteroidsStore from '~/hooks/useAsteroidsStore';
import useAsteroids from '~/hooks/useAsteroids';
import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';
import constants from '~/constants';

const worker = new Worker();

const Asteroids = (props) => {
  const asteroids = useAsteroids();
  const time = useTimeStore(state => state.time);
  const origin = useAsteroidsStore(state => state.origin);
  const selectOrigin = useAsteroidsStore(state => state.selectOrigin);
  const destination = useAsteroidsStore(state => state.destination);
  const selectDestination = useAsteroidsStore(state => state.selectDestination);
  const hovered = useAsteroidsStore(state => state.hoveredAsteroid);
  const setHovered = useAsteroidsStore(state => state.setHoveredAsteroid);

  const [ positions, setPositions ] = useState();
  const [ radii, setRadii ] = useState();
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();

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
    const id = asteroids.data[index].i;
    setHovered(id);
  };

  const onMouseOut = (e) => {
    e.stopPropagation();
    setHovered(null);
  };

  useEffect(() => {
    if (!hovered || hovered === origin?.i || hovered === destination?.i) {
      setHoveredPos(null);
      return;
    }

    const index = asteroids.data.findIndex(a => a.i === hovered);

    if (index > -1) {
      const pos = positions.slice(index * 3, index * 3 + 3);
      setHoveredPos(pos);
    } else {
      setHoveredPos(null);
    }
  }, [ hovered, setHovered, positions, asteroids.data ]);

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
  }, [ time, asteroids.data ]);

  // Receives position updates from the worker
  worker.onmessage = (event) => {
    if (event.data.topic === 'asteroidPositions') setPositions(new Float32Array(event.data.positions));
  };

  useEffect(() => {
    // Check that we have data, positions are processed, and they're in sync
    if (asteroids.data && positions && asteroids.data.length * 3 === positions.length) {
      if (origin) {
        const originKey = asteroids.data.findIndex(a => a.i === origin.i);
        setOriginPos(positions.slice(originKey * 3, originKey * 3 + 3));
      }

      if (destination) {
        const destKey = asteroids.data.findIndex(a => a.i === destination.i);
        setDestinationPos(positions.slice(destKey * 3, destKey * 3 + 3));
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
      {hoveredPos && <Marker asteroidPos={hoveredPos} />}
      {origin && <Orbit asteroid={origin} />}
      {originPos && <Marker asteroidPos={originPos} />}
      {destination && <Orbit asteroid={destination} />}
      {destinationPos && <Marker asteroidPos={destinationPos} />}
      {originPos && destinationPos && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
    </group>
  )
};

export default Asteroids;
