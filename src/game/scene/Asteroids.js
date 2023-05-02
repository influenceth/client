import { Suspense, useContext, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';
import { AxesHelper, Color } from 'three';
import { useThrottleCallback } from '@react-hook/throttle';
import { useThree } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import gsap from 'gsap';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useAssetSearch from '~/hooks/useAssetSearch';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';

import FlightLine from './asteroids/FlightLine';
import Orbit from './asteroids/Orbit';
import Marker from './asteroids/Marker';
import highlighters from './asteroids/highlighters';
import vert from './asteroids/asteroids.vert';
import frag from './asteroids/asteroids.frag';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useWatchlist from '~/hooks/useWatchlist';
import theme from '~/theme';
import { CaptainIcon, MyAssetIcon, RocketIcon } from '~/components/Icons';
import constants from '~/lib/constants';

const assetColor = new Color().setStyle(theme.colors.main);
const watchlistColor = new Color().setStyle('#e35528');

const AsteroidTooltip = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: row;
  pointer-events: none;
  & > div:first-child {
    opacity: ${p => p.hasActiveCrew ? 1 : 0};
    padding-bottom: 3px;
  }
  & > div:last-child {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    & > span {
      background: rgba(0, 0, 0, 0.7);
      padding: 2px 4px;
      white-space: nowrap;
    }
  }
`;


const Asteroids = (props) => {
  const { controls } = useThree();
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const hovered = useStore(s => s.asteroids.hovered);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const routePlannerActive = false; // TODO: (when route planning restored)
  const highlightConfig = useStore(s => s.assetSearch.asteroidsMapped.highlight);
  const cameraNeedsReorientation = useStore(s => s.cameraNeedsReorientation);
  const isAssetSearchMatchingDefault = useStore(s => s.isAssetSearchMatchingDefault);
  const filters = useStore(s => s.assetSearch.asteroids?.filters);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const openHudMenu = useStore(s => s.openHudMenu);
  const hoverAsteroid = useStore(s => s.dispatchAsteroidHovered);
  const unhoverAsteroid = useStore(s => s.dispatchAsteroidUnhovered);
  const selectOrigin = useStore(s => s.dispatchOriginSelected);
  const selectDestination = useStore(s => s.dispatchDestinationSelected);
  const dispatchSwapOriginDestination = useStore(s => s.dispatchSwapOriginDestination);
  
  const isDefaultSearch = useMemo(() => isAssetSearchMatchingDefault('asteroids'), [filters]);
  
  const { processInBackground } = useWebWorker();

  const { data: asteroidSearch } = useAssetSearch('asteroidsMapped');
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const { coarseTime } = useContext(ClockContext);
  const { data: ownedAsteroids } = useOwnedAsteroids();
  const { watchlist: { data: watchlist }} = useWatchlist();

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

  // TODO: can also handle this with white texture and setting color on points, but the hole in the middle to
  // let original point shine through was not aligning consistently
  const assetMarker = useTexture(`${process.env.PUBLIC_URL}/textures/markerFilled_blue.png`);
  const watchlistMarker = useTexture(`${process.env.PUBLIC_URL}/textures/markerFilled_red.png`);

  const assetedAsteroids = useMemo(() => {
    const asseted = {};
    (ownedAsteroids || []).forEach((a) => {
      if (!asseted[a.i]) asseted[a.i] = { asteroid: a };
      asseted[a.i].owned = true;
    });
    if (asteroids?.length > 0) {
      asseted[`${asteroids[0].i}`] = { asteroid: asteroids[0], crew: 1, ships: 2 };
      
    }
    return asseted;
  }, [asteroids, ownedAsteroids]);

  // Update state when asteroids from server, origin, or destination change
  const isZoomedIn = zoomStatus === 'in';
  useEffect(() => {
    const newMappedAsteroids = !!asteroids ? asteroids.slice() : [];

    // in default search, append watchlist and owned as needed
    Object.keys(assetedAsteroids || {}).forEach((i) => {
      const already = newMappedAsteroids.find((a) => a.i === i);
      if (already) already.isAsseted = 1;
      else if (isDefaultSearch) newMappedAsteroids.push(Object.assign({ isAsseted: 1 }, assetedAsteroids[i].asteroid));
    });
    (watchlist || []).forEach((wa) => {
      const already = newMappedAsteroids.find((a) => a.i === wa.asteroid.i);
      if (already) already.isWatched = 1;
      else if (isDefaultSearch) newMappedAsteroids.push(Object.assign({ isWatched: 1 }, wa.asteroid));
    });

    // append origin and destination in case not already in results
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
  }, [ asteroids, origin, destination, isDefaultSearch, assetedAsteroids, watchlist, isZoomedIn ]);

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
    const newColors = mappedAsteroids.map(a => {
      if (highlightConfig) return highlighters[highlightConfig.field](a, highlightConfig);
      return [ 0.87, 0.87, 0.87 ];
    });

    setColors(new Float32Array([].concat.apply([], newColors)));
  }, [ mappedAsteroids, highlightConfig ]);

  // re-computeBoundingSphere on geometry change
  useEffect(() => {
    if (asteroidsGeom.current) {
      console.log('computeBoundingSphere', positions);
      asteroidsGeom.current.computeBoundingSphere();
    }
  }, [positions]);

  useEffect(() => {
    if (!cameraNeedsReorientation || zoomStatus !== 'out' || !controls?.object?.position) return;

    dispatchReorientCamera();
    if (openHudMenu === 'BELT_SIMULATE_ROUTE') {
      gsap.timeline().to(controls.object.position, { x: 0, y: 0, z: 7 * constants.AU, ease: 'slow.out' });

    } else {
      gsap.timeline().to(controls.object.up, { x: 0, y: 0, z: 1, ease: 'slow.out' });

      // if camera is on z-axis, move off
      if (controls.object.position.x === 0 && controls.object.position.y === 0) {
        gsap.timeline().to(controls.object.position, { x: 4 * constants.AU, y: 0, z: controls.object.position.z, ease: 'slow.out' });
      }
    }
  }, [cameraNeedsReorientation]);

  // mouse event handlers
  const onClick = useCallback((e) => {
    e.stopPropagation();
    const index = e.intersections.sort((a, b) => a.distanceToRay - b.distanceToRay)[0].index;
    if (mappedAsteroids[index]) {
      const clickedAsteroidId = mappedAsteroids[index].i;
      if (clickedAsteroidId === destinationId) {
        dispatchSwapOriginDestination();
      } else {
        selectOrigin(clickedAsteroidId);
      }
    }
  }, [mappedAsteroids, destinationId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const { assetPositions, assetPositionsById, watchlistPositions } = useMemo(() => {
    const assetPositions = [];
    const assetPositionsById = {};
    const watchlistPositions = [];
    mappedAsteroids.forEach((a, i) => {
      if (a.i === origin?.i || a.i === destination?.i) {  // always include origin and destination so billboard labeled
        assetPositionsById[a.i] = [positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]];
      } else if (a.isAsseted) {
        assetPositionsById[a.i] = [positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]];
        assetPositions.push(assetPositionsById[a.i][0], assetPositionsById[a.i][1], assetPositionsById[a.i][2]);
      }
      else if (a.isWatched) {
        watchlistPositions.push(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);
      }
    });
    return {
      assetPositions: new Float32Array(assetPositions),
      assetPositionsById,
      watchlistPositions: new Float32Array(watchlistPositions),
    }
  }, [origin, positions, watchlist]); // don't update when mappedAsteroids updated (wait for positions update)

  return (
    <group>
      {openHudMenu !== 'BELT_SIMULATE_ROUTE' && (
        <>
          {/* asset / watchlist markers (zoomed out only) */}
          {zoomStatus === 'out' && (
            <>
              {assetPositions.length > 0 && (
                <points>
                  <pointsMaterial
                    attach="material"
                    depthWrite={false}
                    size={15}
                    sizeAttenuation={false}
                    map={assetMarker}
                    toneMapped={false}
                    transparent />
                  <bufferGeometry>
                    <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ assetPositions, 3 ]} />
                  </bufferGeometry>
                </points>
              )}
              {watchlistPositions.length > 0 && (
                <points>
                  <pointsMaterial
                    attach="material"
                    depthWrite={false}
                    size={15}
                    sizeAttenuation={false}
                    map={watchlistMarker}
                    toneMapped={false}
                    transparent />
                  <bufferGeometry>
                    <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ watchlistPositions, 3 ]} />
                  </bufferGeometry>
                </points>
              )}
            </>
          )}
          {/* all asteroids */}
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
        </>
      )}


      {zoomStatus === 'out' && (
        <>
          {/* hover reticule */}
          {hoveredPos && <Marker asteroidPos={hoveredPos} />}
          
          {/* selected origin marker and orbit */}
          {originPos && <Marker asteroidPos={originPos} isOrigin />}
          {!!origin && <Orbit asteroid={origin} />}

          {/* selected destination marker and orbit */}
          {destinationPos && <Marker asteroidPos={destinationPos} isDestination />}
          {!!destination && <Orbit asteroid={destination} color={'#ff0000'} />}

          {/* flight line (only in simulation mode) */}
          {origin && destination && false && (
            <FlightLine
              currentTime={coarseTime}
              originOrbital={origin.orbital}
              originPos={originPos}
              destinationOrbital={destination.orbital}
              destinationPos={destinationPos} />
          )}

          {/* billboarded data */}
          {asteroids && (
            <group>
              {Object.keys(assetPositionsById).map((i) => {
                const isOrigin = origin?.i === Number(i);
                const isDestination = destination?.i === Number(i);
                const display = openHudMenu !== 'BELT_SIMULATE_ROUTE' || isOrigin || isDestination;
                return !display ? null : (
                  <Html
                    key={i}
                    position={assetPositionsById[i]}
                    style={{ pointerEvents: 'none', transform: `translate(-45px, calc(-100% - ${(isOrigin || isDestination) ? 15 : 5}px))` }}>
                    <AsteroidTooltip hasActiveCrew={assetedAsteroids[i]?.crew}>
                      <div><CaptainIcon /></div>
                      <div>
                        {assetedAsteroids[i] && (
                          <span>
                            {assetedAsteroids[i]?.owned && <MyAssetIcon />}
                            {assetedAsteroids[i]?.ships > 0 && <RocketIcon />}
                            {assetedAsteroids[i]?.ships > 1 && <RocketIcon />}
                          </span>
                        )}
                        {isOrigin && (
                          <span>{origin?.customName || origin?.baseName || `#${(origin?.i || 0).toLocaleString()}`}</span>
                        )}
                        {isDestination && (
                          <span>{destination?.customName || destination?.baseName || `#${(destination?.i || 0).toLocaleString()}`}</span>
                        )}
                      </div>
                    </AsteroidTooltip>
                  </Html>
                );
              })}
            </group>
          )}
        </>
      )}
      {false && <primitive object={new AxesHelper(2 * constants.AU)} />}
    </group>
  )
};

export default Asteroids;
