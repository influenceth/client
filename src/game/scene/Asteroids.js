import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Color } from 'three';
import { useThrottle } from '@react-hook/throttle';

import useAsteroid from '~/hooks/useAsteroid';
import useAsteroids from '~/hooks/useAsteroids';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import highlighters from './asteroids/highlighters';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';

const Asteroids = (props) => {
  const time = useStore(s => s.time.current);
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const hovered = useStore(s => s.asteroids.hovered);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const routePlannerActive = useStore(s => s.outliner.routePlanner.active);
  const ownedColor = useStore(s => s.asteroids.owned.highlightColor);
  const watchedColor = useStore(s => s.asteroids.watched.highlightColor);
  const highlightConfig = useStore(s => s.asteroids.highlight);
  const { processInBackground } = useWebWorker();

  const { data: asteroids } = useAsteroids();
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const selectOrigin = useStore(s => s.dispatchOriginSelected);
  const clearOrigin = useStore(s => s.dispatchOriginCleared);
  const selectDestination = useStore(s => s.dispatchDestinationSelected);
  const hoverAsteroid = useStore(s => s.dispatchAsteroidHovered);
  const unhoverAsteroid = useStore(s => s.dispatchAsteroidUnhovered);

  const [ mappedAsteroids, setMappedAsteroids ] = useState([]);
  const [ positions, setPositions ] = useState(new Float32Array());
  const [ colors, setColors ] = useState(new Float32Array());
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();

  const [ mousePos, setMousePos ] = useThrottle(null, 30);

  const asteroidsGeom = useRef();

  // Update state when asteroids from server, origin, or destination change
  const isZoomedIn = zoomStatus === 'in';
  useEffect(() => {
    const newMappedAsteroids = !!asteroids ? asteroids.slice() : [];

    if (!!origin && !newMappedAsteroids.some(a => a.i === origin.i)) {
      newMappedAsteroids.push(Object.assign({}, origin));
    }

    if (!!destination && !newMappedAsteroids.some(a => a.i === destination.i)) {
      newMappedAsteroids.push(Object.assign({}, destination));
    }

    // if zoomed in, don't render the point for the origin (since rendering 3d version)
    setMappedAsteroids(
      origin && isZoomedIn
        ? newMappedAsteroids.filter((a) => a.i !== origin.i)
        : newMappedAsteroids
    );
  }, [ asteroids, origin, destination, isZoomedIn ]);

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

  // Update asteroid positions whenever the time changes in-game or mapped asteroids are updated
  // TODO: use useFrame instead...
  // TODO: potentially could chunk this in groups of 100 so spread out between threads
  //        OR wait until previous complete OR wait until workerpool not busy
  useEffect(() => {
    // TODO (enahancement): worker used to cache mappedAsteroids, but now that there are multiple
    //  workers, that is not possible... maybe could cache inputs in worker manager and only
    //  send updated input vars per topic to save on copying
    processInBackground(
      { topic: 'updateAsteroidPositions', asteroids: mappedAsteroids, elapsed: time },
      (data) => {
        setPositions(new Float32Array(data.positions));
      }
    )
  }, [ mappedAsteroids, processInBackground, time ]);

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

  useEffect(() => {
    if (mousePos && mousePos.intersections?.length > 0) {
      const index = mousePos.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
      if (asteroids[index]) {
        return hoverAsteroid(asteroids[index].i);
      }
    } 
    unhoverAsteroid();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mousePos]);

  // re-computeBoundingSphere on geometry change
  useEffect(() => {
    if (asteroidsGeom.current) {
      asteroidsGeom.current.computeBoundingSphere();
    }
  }, [positions]);

  // mouse event handlers
  const onClick = useCallback((e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (asteroids[index]) selectOrigin(asteroids[index].i);
  }, [asteroids]); // eslint-disable-line react-hooks/exhaustive-deps

  const onContextClick = useCallback((e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;

    if (asteroids[index]) {
      if (asteroids[index].i === originId) clearOrigin();
      if (!routePlannerActive) return; // Only allow picking a destination if the route planner is open
      selectDestination(asteroids[index].i);
    }
  }, [asteroids, originId, routePlannerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      {positions?.length > 0 && colors?.length > 0 && (
        <points
          onClick={zoomStatus === 'out' && onClick}
          onContextMenu={zoomStatus === 'out' && onContextClick}
          onPointerOver={zoomStatus === 'out' && setMousePos}
          onPointerOut={zoomStatus === 'out' && setMousePos}>
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
            },
            vertexColors: true,
            vertexShader: vert
          }]} />
        </points>
      )}
      {zoomStatus === 'out' && (
        <Suspense fallback={<group />}>
          {hoveredPos && <Marker asteroidPos={hoveredPos} />}
          {originPos && <Marker asteroidPos={originPos} />}
          {destinationPos && <Marker asteroidPos={destinationPos} />}
        </Suspense>
      )}
      {zoomStatus === 'out' && (
        <>
          {!!origin && <Orbit asteroid={origin} />}
          {!!destination && <Orbit asteroid={destination} />}
          {originPos && destinationPos && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
        </>
      )}
    </group>
  )
};

export default Asteroids;
