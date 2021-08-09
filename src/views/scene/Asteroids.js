import { Suspense, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Color } from 'three';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroids from '~/hooks/useAsteroids';
import useAsteroid from '~/hooks/useAsteroid';
import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import highlighters from './asteroids/highlighters';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';
import constants from '~/lib/constants';

const worker = new Worker();

const Asteroids = (props) => {
  const time = useStore(state => state.time.current);
  const originId = useStore(state => state.asteroids.origin);
  const destinationId = useStore(state => state.asteroids.destination);
  const hovered = useStore(state => state.asteroids.hovered);
  const zoomStatus = useStore(state => state.asteroids.zoomStatus);
  const routePlannerActive = useStore(state => state.outliner.routePlanner.active);
  const ownedColor = useStore(state => state.asteroids.owned.highlightColor);
  const watchedColor = useStore(state => state.asteroids.watched.highlightColor);
  const highlightConfig = useStore(state => state.asteroids.highlight);

  const { data: asteroids } = useAsteroids();
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const selectOrigin = useStore(state => state.dispatchOriginSelected);
  const clearOrigin = useStore(state => state.dispatchOriginCleared);
  const selectDestination = useStore(state => state.dispatchDestinationSelected);
  const hoverAsteroid = useStore(state => state.dispatchAsteroidHovered);
  const unhoverAsteroid = useStore(state => state.dispatchAsteroidUnhovered);

  const [ mappedAsteroids, setMappedAsteroids ] = useState([]);
  const [ positions, setPositions ] = useState(new Float32Array());
  const [ colors, setColors ] = useState(new Float32Array());
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();
  const asteroidsGeom = useRef();

  const onClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (asteroids[index]) selectOrigin(asteroids[index].i);
  };

  const onContextClick = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;

    if (asteroids[index]) {
      if (asteroids[index].i === originId) clearOrigin();
      if (!routePlannerActive) return; // Only allow picking a destination if the route planner is open
      selectDestination(asteroids[index].i);
    }
  }

  const onMouseOver = (e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (asteroids[index]) hoverAsteroid(asteroids[index].i);
  };

  const onMouseOut = (e) => {
    e.stopPropagation();
    unhoverAsteroid();
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
    }
  }, [ mappedAsteroids, positions, originId, destinationId ]);

  // Update colors
  useEffect(() => {
    const color = new Color();

    const newColors = mappedAsteroids.map(a => {
      if (highlightConfig && a.hasOwnProperty('f')) return highlighters[highlightConfig.field](a.f, highlightConfig);
      if (a.owned) return color.set(ownedColor).toArray();
      if (a.watched) return color.set(watchedColor).toArray();
      return [ 0.87, 0.87, 0.87 ];
    });

    setColors(new Float32Array([].concat.apply([], newColors)));
  }, [ mappedAsteroids, ownedColor, watchedColor, highlightConfig ]);

  useLayoutEffect(() => {
    asteroidsGeom.current?.computeBoundingSphere();
  });

  return (
    <group>
      {positions?.length > 0 && colors?.length > 0 && (
        <points
          onClick={zoomStatus === 'out' && onClick}
          onContextMenu={zoomStatus === 'out' && onContextClick}
          onPointerOver={zoomStatus === 'out' && onMouseOver}
          onPointerOut={zoomStatus === 'out' && onMouseOut} >
          <bufferGeometry ref={asteroidsGeom}>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ positions, 3 ]} />
            <bufferAttribute attachObject={[ 'attributes', 'highlightColor' ]} args={[ colors, 3 ]} />
          </bufferGeometry>
          <shaderMaterial args={[{
            depthWrite: false,
            fragmentShader: frag,
            transparent: true,
            uniforms: {
              uOpacity: { type: 'f', value: zoomStatus === 'out' ? 1.0 : 0.5 },
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
        {hoveredPos && zoomStatus === 'out' && <Marker asteroidPos={hoveredPos} />}
        {originPos && zoomStatus === 'out' && <Marker asteroidPos={originPos} />}
        {destinationPos && <Marker asteroidPos={destinationPos} />}
      </Suspense>
      {!!origin && zoomStatus === 'out' && <Orbit asteroid={origin} />}
      {!!destination && <Orbit asteroid={destination} />}
      {originPos && destinationPos && zoomStatus === 'out' && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
    </group>
  )
};

export default Asteroids;
