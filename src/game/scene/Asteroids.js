import { Suspense, useContext, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Color } from 'three';
import { useThrottleCallback } from '@react-hook/throttle';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidSearch from '~/hooks/useAsteroidSearch';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';

import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import highlighters from './asteroids/highlighters';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';

const Asteroids = (props) => {
  const { controls } = useThree();
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const hovered = useStore(s => s.asteroids.hovered);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const routePlannerActive = useStore(s => s.outliner.routePlanner.active);
  const ownedColor = useStore(s => s.asteroids.owned.highlightColor);
  const watchedColor = useStore(s => s.asteroids.watched.highlightColor);
  const highlightConfig = useStore(s => s.asteroids.highlight);
  const cameraNeedsReorientation = useStore(s => s.cameraNeedsReorientation);
  
  const { processInBackground } = useWebWorker();

  const { data: asteroidSearch } = useAsteroidSearch();
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const { coarseTime } = useContext(ClockContext);

  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const selectOrigin = useStore(s => s.dispatchOriginSelected);
  const selectDestination = useStore(s => s.dispatchDestinationSelected);
  const hoverAsteroid = useStore(s => s.dispatchAsteroidHovered);
  const unhoverAsteroid = useStore(s => s.dispatchAsteroidUnhovered);

  const [ mappedAsteroids, setMappedAsteroids ] = useState([]);
  const [ asteroidsWorkerPayload, setAsteroidsWorkerPayload ] = useState();
  const [ positions, setPositions ] = useState(new Float32Array());
  const [ colors, setColors ] = useState(new Float32Array());
  const [ hoveredPos, setHoveredPos ] = useState();
  const [ originPos, setOriginPos ] = useState();
  const [ destinationPos, setDestinationPos ] = useState();

  const isUpdating = useRef(false);

  const asteroidsGeom = useRef();
  
  const asteroids = useMemo(() => {
    return asteroidSearch?.hits?.length > 0 ? asteroidSearch.hits : [];
  }, [asteroidSearch?.hits]);

  useEffect(() => {
    console.log(highlightConfig, highlighters)
  }, []);


  // Update state when asteroids from server, origin, or destination change
  const isZoomedIn = zoomStatus === 'in';
  useEffect(() => {
    const newMappedAsteroids = !!asteroids ? asteroids.slice() : [];

    if (!!origin && !newMappedAsteroids.find(a => a.i === origin.i)) {
      newMappedAsteroids.push(Object.assign({}, origin));
    }

    if (!!destination && !newMappedAsteroids.find(a => a.i === destination.i)) {
      newMappedAsteroids.push(Object.assign({}, destination));
    }

    // if zoomed in, don't render the point for the origin (since rendering 3d version)
    const newValue = origin && isZoomedIn
      ? newMappedAsteroids.filter((a) => a.i !== origin.i)
      : newMappedAsteroids;
    setMappedAsteroids(newValue);
    setAsteroidsWorkerPayload({
      key: newValue.map((a) => a.i).join(','),
      orbitals: newValue.map((a) => a.orbital),
    })
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
  // TODO: would probably have much smoother motion (at very fast-forwarded speeds) by
  //  managing trigger for this in a useFrame loop (rather than listening for coarseTime update),
  //  and setting geometry attributes directly, rather than through state... could potentially do
  //  fewer updates / only update on coarseTime when zoomed in
  useEffect(() => {
    if (coarseTime && asteroidsWorkerPayload && !isUpdating.current) {
      isUpdating.current = true;
      processInBackground(
        {
          topic: 'updateAsteroidPositions',
          asteroids: asteroidsWorkerPayload,
          elapsed: coarseTime,
          _cacheable: 'asteroids'
        },
        (data) => {
          setPositions(data.positions);
          isUpdating.current = false;
        }
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coarseTime, asteroidsWorkerPayload])

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
      if (highlightConfig) return highlighters[highlightConfig.field](a, highlightConfig);
      if (a.owned) return color.set(ownedColor).toArray();
      if (a.watched) return color.set(watchedColor).toArray();
      return [ 0.87, 0.87, 0.87 ];
    });

    setColors(new Float32Array([].concat.apply([], newColors)));
  }, [ mappedAsteroids, ownedColor, watchedColor, highlightConfig ]);

  // re-computeBoundingSphere on geometry change
  useEffect(() => {
    if (asteroidsGeom.current) {
      asteroidsGeom.current.computeBoundingSphere();
    }
  }, [positions]);

  useEffect(() => {
    if (!cameraNeedsReorientation || zoomStatus !== 'out') return;
    dispatchReorientCamera();
    gsap.timeline().to(controls.object.up, { x: 0, y: 0, z: 1, ease: 'slow.out' });
  }, [cameraNeedsReorientation]);

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
      if (asteroids[index].i === originId) selectOrigin();
      if (!routePlannerActive) return; // Only allow picking a destination if the route planner is open
      selectDestination(asteroids[index].i);
    }
  }, [asteroids, originId, routePlannerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMousePos = useThrottleCallback((mousePos) => {
    if (mousePos && mousePos.intersections?.length > 0) {
      const index = mousePos.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
      if (asteroids[index]) {
        return hoverAsteroid(asteroids[index].i);
      }
    }
    unhoverAsteroid();
  }, 30);  // eslint-disable-line react-hooks/exhaustive-deps

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
        <>
          <Suspense fallback={<group />}>
            {hoveredPos && <Marker asteroidPos={hoveredPos} />}
            {originPos && <Marker asteroidPos={originPos} />}
            {destinationPos && <Marker asteroidPos={destinationPos} />}
          </Suspense>
          {!!origin && <Orbit asteroid={origin} />}
          {!!destination && <Orbit asteroid={destination} />}
          {originPos && destinationPos && <FlightLine originPos={originPos} destinationPos={destinationPos} />}
        </>
      )}
    </group>
  )
};

export default Asteroids;
