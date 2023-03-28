import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CircleGeometry,
  Color,
  FrontSide,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  TextureLoader,
  Vector2,
  Vector3
} from 'three';
import { useQueryClient } from 'react-query';
import { Asteroid } from '@influenceth/sdk';

import useAsteroidLots from '~/hooks/useAsteroidLots';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import useAsteroidCrewSamples from '~/hooks/useAsteroidCrewSamples';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';
import { getLotGeometryHeightMaps, getLotGeometryHeightMapResolution } from './helpers/LotGeometry';

const MAIN_COLOR = new Color(theme.colors.main).convertSRGBToLinear();
const STROKE_COLOR = new Color().setHex(0xbbbbbb).convertSRGBToLinear();
const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const FILL_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const PLOT_LOADER_GEOMETRY_PCT = 0.25;

const MOUSEABLE_WIDTH = 800;
const MAX_MESH_INSTANCES = Asteroid.MAX_LOTS_RENDERED;  // TODO: maybe can adjust with GPU dependent, but keep in mind lots are now indexed to region
const PIP_VISIBILITY_ALTITUDE = 25000;
const OUTLINE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.5;
const MOUSE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE;

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;
const MOUSE_THROTTLE_TIME = 1000 / 30; // ms

const Lots = ({ attachTo, asteroidId, axis, cameraAltitude, cameraNormalized, config, getLockToSurface, getRotation }) => {
  const { token } = useAuth();
  const { crew } = useCrewContext();
  const { gl, scene } = useThree();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const { processInBackground } = useWebWorker();

  const mapResourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);
  const textureQuality = useStore(s => s.graphics.textureQuality);
  const dispatchLotsLoading = useStore(s => s.dispatchLotsLoading);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const { lotId: selectedLotId } = useStore(s => s.asteroids.lot || {});

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);
  const [lastClick, setLastClick] = useState();

  const positions = useRef();
  const orientations = useRef();
  const lotsByRegion = useRef([]);
  const buildingsByRegion = useRef([]);

  const pipMesh = useRef();
  const mouseableMesh = useRef();
  const buildingMesh = useRef();

  const lotStrokeMesh = useRef();
  const lotFillMesh = useRef();
  const lastMouseIntersect = useRef(new Vector3());
  const highlighted = useRef();
  const lotLoaderInterval = useRef();

  const mouseHoverMesh = useRef();
  const selectionMesh = useRef();
  const lotsInitialized = useRef();

  const lastMouseUpdatePosition = useRef(new Vector2());
  const lastMouseUpdateTime = useRef(0);
  const mouseIsOut = useRef(false);
  const clickStatus = useRef();

  const PLOT_WIDTH = useMemo(() => Math.min(125, config?.radius / 25), [config?.radius]);
  const PLOT_STROKE_MARGIN = useMemo(() => 0.125 * PLOT_WIDTH, [PLOT_WIDTH]);
  const BUILDING_RADIUS = useMemo(() => 0.375 * PLOT_WIDTH, [PLOT_WIDTH]);
  const PIP_RADIUS = useMemo(() => 0.25 * PLOT_WIDTH, [PLOT_WIDTH]);
  const RETICULE_WIDTH = 5 * PLOT_WIDTH;

  const chunkyAltitude = useMemo(() => Math.round(cameraAltitude / 500) * 500, [cameraAltitude]);

  const lotTally = useMemo(() => Asteroid.getSurfaceArea(asteroidId, config?.radiusNominal / 1e3), [config?.radiusNominal]);
  const regionTally = useMemo(() => Asteroid.getLotRegionTally(lotTally), [lotTally]);
  const visibleLotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, lotTally), [lotTally]);

  const { data: lots, isLoading: allLotsLoading, refetch: refetchLots } = useAsteroidLots(asteroidId, lotTally);
  const { data: crewLots, isLoading: crewLotsLoading } = useAsteroidCrewLots(asteroidId);
  const { data: sampledLots, isLoading: sampledLotsLoading } = useAsteroidCrewSamples(asteroidId, mapResourceId);

  // NOTE: for every dependency on `lots`, should also include `lastLotUpdate` so react triggers it
  //  (it seems react does not handle sparse arrays very well for equality checks)
  const [lastLotUpdate, setLastLotUpdate] = useState();

  const sampledLotMap = useMemo(() => {
    if (sampledLots) {
      return sampledLots.reduce((acc, i) => { acc[i] = true; return acc; }, {});
    } else if (sampledLotsLoading) {
      return {};
    }
    return null;
  }, [sampledLots]);

  const crewLotMap = useMemo(() => {
    if (crewLotsLoading) return null;
    return (crewLots || []).reduce((acc, p) => {
      acc[p.i] = true;
      return acc;
    }, {});
  }, [crewLots, crewLotsLoading]);
  const lotsReady = (!allLotsLoading && !crewLotsLoading && !!crewLotMap);
  const buildingTally = useMemo(() => lots && Object.values(lots).reduce((acc, cur) => acc + (cur > 0 ? 1 : 0), 0), [lots, lastLotUpdate]);
  const visibleBuildingTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, buildingTally), [buildingTally]);

  // if just navigated to asteroid and lots already loaded, refetch
  // (b/c might have missed ws updates while on a different asteroid)
  // TODO: probably technically need to capture allLotsReloading / lotsReady alongside lastLotUpdate in dependency arrays
  useEffect(() => {
    if (lots) refetchLots();
  }, []);

  // position lots and bucket into regions (as needed)
  // BATCHED region bucketing is really only helpful for largest couple asteroids
  // NOTE: this just runs once when lots is initial populated
  useEffect(() => {
    if (!lots) return;

    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    const batchSize = 25000;
    const expectedBatches = Math.ceil(lotTally / batchSize);

    // (if no offscreencanvas, need to render heightmaps before sending to webworker)
    let heightMaps = null;
    let transfer = [];
    if (typeof OffscreenCanvas === 'undefined') {
      heightMaps = getLotGeometryHeightMaps(
        prunedConfig,
        getLotGeometryHeightMapResolution(config, textureQuality)
      );
      transfer = heightMaps.map((m) => m.buffer.buffer);
    }

    if (lotLoaderInterval.current) clearInterval(lotLoaderInterval.current);
    lotLoaderInterval.current = setInterval(() => {
      dispatchLotsLoading(asteroidId, 0, PLOT_LOADER_GEOMETRY_PCT)
    }, 250);

    // vvv BENCHMARK: 1400ms on AP, 350ms on 8, 200ms on 800
    //                1200, 170, 40 if maps already generated
    processInBackground(
      {
        topic: 'buildLotGeometry',
        asteroid: {
          key: asteroidId,
          config: prunedConfig,
        },
        aboveSurface: 0,
        heightMaps,
        textureQuality,
        _cacheable: 'asteroid'
      },
      (data) => {
        // ^^^
        if (lotLoaderInterval.current) clearInterval(lotLoaderInterval.current);

        // vvv BENCHMARK: 1400ms on AP, 150ms on 8, 19ms on 800
        positions.current = data.positions;
        orientations.current = data.orientations;
        lotsByRegion.current = [];

        let batchesProcessed = 0;
        for (let batchStart = 0; batchStart < lotTally; batchStart += batchSize) {
          const batchPositions = data.positions.slice(batchStart * 3, (batchStart + batchSize) * 3);
          processInBackground({
            topic: 'buildLotRegions',
            data: {
              positions: batchPositions,
              regionTally
            }
          }, ({ regions }) => { // eslint-disable-line no-loop-func
            regions.forEach((region, i) => {
              const lotId = batchStart + i + 1;
              if (!lotsByRegion.current[region]) lotsByRegion.current[region] = [];
              lotsByRegion.current[region].push(lotId);

              // (if there is building data) if there is a building, also add to building region records
              if (lots[lotId]) {
                if (!buildingsByRegion.current[region]) buildingsByRegion.current[region] = [];
                buildingsByRegion.current[region].push(lotId);
              }
            });
            batchesProcessed++;
            if (batchesProcessed === expectedBatches) {
              // console.log('positionsready');
              // ^^^
              setPositionsReady(true);
            }
            dispatchLotsLoading(asteroidId, PLOT_LOADER_GEOMETRY_PCT + (1 - PLOT_LOADER_GEOMETRY_PCT) * batchesProcessed / expectedBatches);
          }, [
            batchPositions.buffer
          ]);
        }
      },
      transfer
    );
  }, [!lots]); // eslint-disable-line react-hooks/exhaustive-deps

  // run this when lots changes (after its initial run through the effect that follows this one)
  useEffect(() => {
    if (lots && lotsByRegion.current?.length) {
      Object.keys(lotsByRegion.current).forEach((region) => {
        buildingsByRegion.current[region] = lotsByRegion.current[region].filter((lotId) => lots[lotId] > 0);
      });
    }
  }, [lots, lastLotUpdate]);

  const handleWSMessage = useCallback(({ type: eventType, body }) => {
    // TODO: these events could/should technically go through the same invalidation process as primary events
    //  (it's just that these events won't match as much data b/c most may not be relevant to my crew)

    // if lot occupied or lot unoccupied, update lots by updating querycache
    switch (eventType) {
      case 'Lot_Occupied': {
        queryClient.setQueryData([ 'asteroidLots', body.returnValues.asteroidId ], (currentLotsValue) => {
          if (body.returnValues.crewId > 0) {
            currentLotsValue[body.returnValues.lotId] = true;
          } else {
            delete currentLotsValue[body.returnValues.lotId];
          }
          return currentLotsValue;
        });
        setLastLotUpdate(Date.now());
      }
    }

    // // // // //
    // TODO: vvv maybe remove this when updating more systematically from linked data

    // try to minimize redundant updates by just listening to Dispatcher_* events
    if (eventType.match(/^Dispatcher_/)) {
      // myCrew will handle their own invalidations through the default ws room
      const isMyCrew = crew?.i && body.linked.find(({ type, asset }) => type === 'Crew' && asset?.i === crew.i);
      if (!isMyCrew) {
        // find any lot data on this asteroid... if it is complete and in my cache, replace my cache value
        const optimisticLots = body.linked.filter(({ type, asset }) => type === 'Lot' && asset?.asteroid === asteroidId);
        optimisticLots.forEach(({ asset: optimisticLot }) => {
          const queryKey = ['lots', asteroidId, optimisticLot.i];
          if (!!queryClient.getQueryData(queryKey)) {
            const needsBuilding = !!optimisticLot.building;
            optimisticLot.building = body.linked
              .find(({ type, asset }) => type === optimisticLot.building?.type && asset?.i === optimisticLot.building?.i)
              ?.asset;
            if (!needsBuilding || !!optimisticLot.building) {
              queryClient.setQueryData(queryKey, optimisticLot);
            }
          }
        });
      }
    }

    // ^^^
    // // // // //

  }, []);

  useEffect(() => {
    if (token && wsReady) {
      let roomName = `Asteroid::${asteroidId}`;
      registerWSHandler(handleWSMessage, roomName);
      return () => {
        unregisterWSHandler(roomName);

        // since will not be listening to asteroid room when zoomed away, remove ['asteroidLots', asteroidId]
        // and all ['lots', asteroidId, *] that are not occupied by me when I navigate away from the asteroid
        queryClient.removeQueries({ queryKey: [ 'asteroidLots', asteroidId ] });
        queryClient.getQueriesData(['lots', asteroidId])
          .filter(([ queryKey, data ]) => data && data.occupier !== crew?.i)
          .forEach(([ queryKey ]) => { queryClient.removeQueries({ queryKey }); });
      }
    }
  }, [token, handleWSMessage, wsReady]);

  // instantiate pips mesh
  useEffect(() => {
    if (!visibleLotTally) return;

    const pipGeometry = new CircleGeometry(PIP_RADIUS, 6);
    const pipMaterial = new MeshBasicMaterial({
      color: WHITE_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.6,
      toneMapped: false,
      transparent: true,
    });

    pipMesh.current = new InstancedMesh(pipGeometry, pipMaterial, visibleLotTally);
    pipMesh.current.renderOrder = 999;
    (attachTo || scene).add(pipMesh.current);

    const mouseableGeometry = new CircleGeometry(MOUSEABLE_WIDTH, 6);
    const mouseableMaterial = new MeshBasicMaterial({
      // color: 0x00ff00, opacity: 0.5, // for debugging
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: true,
    });

    mouseableMesh.current = new InstancedMesh(mouseableGeometry, mouseableMaterial, visibleLotTally);
    mouseableMesh.current.renderOrder = 999;
    (attachTo || scene).add(mouseableMesh.current);

    return () => {
      if (pipMesh.current) {
        (attachTo || scene).remove(pipMesh.current);
      }
      if (mouseableMesh.current) {
        (attachTo || scene).remove(mouseableMesh.current);
      }
    };

  }, [visibleLotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate buildings mesh
  useEffect(() => {
    if (!visibleBuildingTally) return;

    const buildingGeometry = new CircleGeometry(BUILDING_RADIUS, 6);
    // buildingGeometry.rotateX(-Math.PI / 2);
    const buildingMaterial = new MeshBasicMaterial({
      color: new Color().setHex(0xffffff),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: false,
    });

    buildingMesh.current = new InstancedMesh(buildingGeometry, buildingMaterial, visibleBuildingTally);
    buildingMesh.current.renderOrder = 999;
    buildingMesh.current.userData.bloom = true;
    (attachTo || scene).add(buildingMesh.current);

    return () => {
      if (buildingMesh.current) {
        (attachTo || scene).remove(buildingMesh.current);
      }
    };

  }, [visibleBuildingTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate lot outline mesh
  useEffect(() => {
    if (!visibleLotTally) return;

    // const strokeGeometry = new TorusGeometry(PLOT_WIDTH, 5, 3, 6);
    const strokeGeometry = new RingGeometry(PLOT_WIDTH, PLOT_WIDTH + PLOT_STROKE_MARGIN, 6, 1);
    const strokeMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: false,
    });

    lotStrokeMesh.current = new InstancedMesh(strokeGeometry, strokeMaterial, visibleLotTally);
    lotStrokeMesh.current.renderOrder = 999;
    (attachTo || scene).add(lotStrokeMesh.current);

    return () => {
      if (lotStrokeMesh.current) {
        (attachTo || scene).remove(lotStrokeMesh.current);
      }
    };
  }, [visibleLotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate lot fill mesh
  // TODO: instantiate only in resource mode?
  useEffect(() => {
    if (!visibleLotTally) return;

    // const fillGeometry = new CircleGeometry(PLOT_WIDTH - PLOT_STROKE_MARGIN, 6);
    const fillGeometry = new CircleGeometry(PLOT_WIDTH - PLOT_STROKE_MARGIN, 6);
    const fillMaterial = new MeshBasicMaterial({
      color: FILL_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.5,
      side: FrontSide,
      toneMapped: false,
      transparent: true
    });

    lotFillMesh.current = new InstancedMesh(fillGeometry, fillMaterial, visibleLotTally);
    lotFillMesh.current.renderOrder = 998;
    (attachTo || scene).add(lotFillMesh.current);

    return () => {
      if (lotFillMesh.current) {
        (attachTo || scene).remove(lotFillMesh.current);
      }
    };
  }, [visibleLotTally]);

  // listen for click events
  // NOTE: if just use onclick, then fires on drag events too :(
  useEffect(() => {
    const onMouseEvent = function (e) {
      if (e.type === 'pointerdown') {
        clickStatus.current = new Vector2(e.clientX, e.clientY);
      }
      else if (e.type === 'pointerup' && clickStatus.current) {
        const distance = clickStatus.current.distanceTo(new Vector2(e.clientX, e.clientY));
        if (distance < 3) {
          setLastClick(Date.now());
        }
      } else if (e.type === 'pointerenter') {
        mouseIsOut.current = false;
      } else if (e.type === 'pointerleave') {
        mouseIsOut.current = true;
      }
    };
    gl.domElement.addEventListener('pointerdown', onMouseEvent, true);
    gl.domElement.addEventListener('pointerenter', onMouseEvent, true);
    gl.domElement.addEventListener('pointerleave', onMouseEvent, true);
    gl.domElement.addEventListener('pointerup', onMouseEvent, true);
    return () => {
      gl.domElement.removeEventListener('pointerdown', onMouseEvent, true);
      gl.domElement.removeEventListener('pointerenter', onMouseEvent, true);
      gl.domElement.removeEventListener('pointerleave', onMouseEvent, true);
      gl.domElement.removeEventListener('pointerup', onMouseEvent, true);
    };
  }, []);

  // instantiate mouse mesh
  useEffect(() => {
    mouseHoverMesh.current = new Mesh(
      new PlaneGeometry(RETICULE_WIDTH, RETICULE_WIDTH),
      new MeshBasicMaterial({
        color: WHITE_COLOR,
        depthTest: false,
        map: new TextureLoader().load('/textures/asteroid/reticule.png'),
        opacity: 0.5,
        side: FrontSide,
        toneMapped: false,
        transparent: true
      })
    );
    mouseHoverMesh.current.renderOrder = 999;
    mouseHoverMesh.current.userData.bloom = true;
    (attachTo || scene).add(mouseHoverMesh.current);
    return () => {
      if (mouseHoverMesh.current) {
        (attachTo || scene).remove(mouseHoverMesh.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate selection mesh
  useEffect(() => {
    selectionMesh.current = new Mesh(
      new PlaneGeometry(RETICULE_WIDTH, RETICULE_WIDTH),
      new MeshBasicMaterial({
        color: WHITE_COLOR,
        depthTest: false,
        map: new TextureLoader().load('/textures/asteroid/reticule.png'),
        side: FrontSide,
        toneMapped: false,
        transparent: true
      })
    );
    selectionMesh.current.renderOrder = 999;
    selectionMesh.current.userData.bloom = true;
    (attachTo || scene).add(selectionMesh.current);
    return () => {
      if (selectionMesh.current) {
        (attachTo || scene).remove(selectionMesh.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateVisibleLots = useCallback(() => {
    if (!positions.current) return;
    if (!regionsByDistance?.length) return;
    if (!lotsByRegion.current?.length) return;
    if (!buildingsByRegion.current) return;
    try {
      const dummy = new Object3D();

      let buildingsRendered = 0;
      let fillsRendered = 0;
      let pipsRendered = 0;
      let breakLoop = false;

      let updateBuildingMatrix = false;
      let updateFillMatrix = false;
      let updatePipMatrix = false;
      let updateMouseableMatrix = false;
      let updateStrokeMatrix = false;
      let updateBuildingColor = false;
      let updateStrokeColor = false;

      // scale down buildings if in fill-mode and zoomed in pretty close (so can see fill)
      const buildingScale = ((cameraAltitude < OUTLINE_VISIBILITY_ALTITUDE && sampledLotMap) ? 0.5 : 1)
        * Math.max(1, Math.min(250 / BUILDING_RADIUS, cameraAltitude / 15000));

      let i = 0;
      regionsByDistance.every((lotRegion) => {
        // use lotsByRegion on first pass even if zoomed out so single-render asteroids are ready
        // else, use buildings-only source once have been through closest X lots (i.e. rendered all pips needed for this altitude)
        // (without this, imagine all the unnecessary loops if there were a single building on AP)
        const lotSource = i < visibleLotTally && (cameraAltitude <= PIP_VISIBILITY_ALTITUDE || !lotsInitialized.current)
          ? lotsByRegion.current
          : buildingsByRegion.current;
        if (!lotSource[lotRegion]) return true;

        // TODO (enhancement): on altitude change (where rotation has not changed), don't need to recalculate pip matrixes, etc
        //  (i.e. even when lotTally > visibleLotTally)... just would need to update building matrixes (to update scale)
        lotSource[lotRegion].every((lotId) => {
          const hasBuilding = (lots[lotId] || crewLotMap[lotId]) && (buildingsRendered < visibleBuildingTally);
          const hasPip = (pipsRendered + buildingsRendered) < visibleLotTally;
          const hasFill = sampledLotMap && sampledLotMap[lotId] && (fillsRendered < visibleBuildingTally);
          const hasMouseable = lotTally > visibleLotTally || !lotsInitialized.current;
          const hasStroke = lotTally > visibleLotTally || !lotsInitialized.current;
          if (hasBuilding || hasPip || hasMouseable || hasFill) {

            // MATRIX
            // > if have a building, always need to rebuild entire matrix (to update scale with altitude)
            // > if have a pip, only need to rebuild matrix if lot visibility is dynamic (i.e. lotTally > visibleLotTally)
            // > if have fill, only need to rebuild if fill source has changed (listen to lotsInitialized)
            // > mouseable, stroke, and fill matrix will not change unless pip matrix does (but will need to change around buildings and pips)
            if (hasBuilding || lotTally > visibleLotTally || !lotsInitialized.current) {
              const lotIndex = lotId - 1;

              dummy.position.set(
                positions.current[lotIndex * 3 + 0],
                positions.current[lotIndex * 3 + 1],
                positions.current[lotIndex * 3 + 2]
              );

              dummy.lookAt(
                orientations.current[lotIndex * 3 + 0],
                orientations.current[lotIndex * 3 + 1],
                orientations.current[lotIndex * 3 + 2]
              );

              // update building matrix or pip matrix
              if (hasBuilding) {
                dummy.scale.set(buildingScale, buildingScale, buildingScale);
                dummy.updateMatrix();

                buildingMesh.current.setMatrixAt(buildingsRendered, dummy.matrix);
                updateBuildingMatrix = true;
              }

              // everything but buildings should be scaled to 1
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();

              // if no building, show pip
              if (!hasBuilding) {
                pipMesh.current.setMatrixAt(pipsRendered, dummy.matrix);
                updatePipMatrix = true;
              }

              // update fill matrix
              if (hasFill) {
                lotFillMesh.current.setMatrixAt(fillsRendered, dummy.matrix);
                updateFillMatrix = true;
              }

              // update stroke matrix
              if (hasStroke) {
                lotStrokeMesh.current.setMatrixAt(i, dummy.matrix);
                updateStrokeMatrix = true;
              }

              // update mouseable matrix
              // TODO: should these always face the camera? or have a slight bias towards camera at least?
              if (hasMouseable) {
                mouseableMesh.current.setMatrixAt(i, dummy.matrix);
                updateMouseableMatrix = true;
              }
            }

            // COLOR
            // > if have a building, must always update color (because matrix always updated, so instance indexes will change position)
            //  (if logged in -- otherwise, can't be white anyway so just color once on initialization)
            // > pips never need color updated
            // > strokes use building color (if building) else pip color (only need to be updated after initialization if dynamic)
            let lotColor;
            if (hasBuilding) {
              // white if occupied by me; else, blue
              lotColor = crewLotMap[lotId] ? WHITE_COLOR : MAIN_COLOR;
            }
            if (hasBuilding && (!!crewLotMap || !lotsInitialized.current)) {
              // if this is first color change to instance, need to let material know
              // TODO (enhancement): could check if there is a color change against existing buildingMesh instanceColor before setting updateBuildingColor
              if (!buildingMesh.current.instanceColor && !buildingMesh.current.material.needsUpdate) {
                buildingMesh.current.material.needsUpdate = true;
              }
              buildingMesh.current.setColorAt(buildingsRendered, lotColor);
              updateBuildingColor = true;
            }
            if (lotTally > visibleLotTally || !lotsInitialized.current) {
              // if this is first color change to instance, need to let material know
              if (!lotStrokeMesh.current.instanceColor && !lotStrokeMesh.current.material.needsUpdate) {
                lotStrokeMesh.current.material.needsUpdate = true;
              }
              // if (hasFill) {
              //   lotStrokeMesh.current.setColorAt(i, FILL_COLOR);
              // } else 
              lotStrokeMesh.current.setColorAt(i, lotColor || STROKE_COLOR);
              updateStrokeColor = true;
            }
          }

          if (hasBuilding) {
            buildingsRendered++;
          } else if (hasPip) {
            pipsRendered++;
          }
          if (hasFill) {
            fillsRendered++;
          }
          i++;

          // break loop if all visible buildings are rendered AND *something* is rendered on closest visibleLots
          breakLoop = (buildingsRendered >= visibleBuildingTally && (pipsRendered + buildingsRendered) >= visibleLotTally);

          if (breakLoop) return false;
          return true;
        });
        if (breakLoop) return false;
        return true;
      });
      pipMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : Math.min(pipsRendered, visibleLotTally);
      lotFillMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : Math.min(fillsRendered, visibleLotTally);
      mouseableMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : visibleLotTally;
      lotStrokeMesh.current.count = cameraAltitude > OUTLINE_VISIBILITY_ALTITUDE ? 0 : visibleLotTally;
      // console.log('i', i, buildingsRendered, pipsRendered, pipMesh.current.count);

      // (building mesh isn't created if no buildings)
      if (buildingMesh.current && updateBuildingColor) buildingMesh.current.instanceColor.needsUpdate = true;
      if (buildingMesh.current && updateBuildingMatrix) buildingMesh.current.instanceMatrix.needsUpdate = true;
      if (pipMesh.current && updatePipMatrix) pipMesh.current.instanceMatrix.needsUpdate = true;
      if (mouseableMesh.current && updateMouseableMatrix) mouseableMesh.current.instanceMatrix.needsUpdate = true;
      if (lotFillMesh.current && updateFillMatrix) lotFillMesh.current.instanceMatrix.needsUpdate = true;
      if (lotStrokeMesh.current && updateStrokeColor) lotStrokeMesh.current.instanceColor.needsUpdate = true;
      if (lotStrokeMesh.current && updateStrokeMatrix) lotStrokeMesh.current.instanceMatrix.needsUpdate = true;

      lotsInitialized.current = true;

      // console.log('data', data.debugs);
      // if (data.debugs) {
      //   const pointsGeometry = new BufferGeometry();
      //   pointsGeometry.setAttribute('position', new BufferAttribute(data.debugs, 3));
      //   lotMesh.current = new Points(
      //     pointsGeometry,
      //     new PointsMaterial({
      //       color: 'white',
      //       size: 20,
      //       sizeAttenuation: true
      //     })
      //   );
      //   lotMesh.current.userData.bloom = true;
      // }
      // scene.add(lotMesh.current);
    } catch (e) {
      // non-insignificant chance of this being mid-process when the asteroid is
      // changed, so needs to fail gracefully (i.e. if buildingMesh.current is unset)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAltitude, lots, lastLotUpdate, crewLotMap, sampledLotMap, regionsByDistance]);

  useEffect(
    () => updateVisibleLots(),
    [chunkyAltitude, positionsReady, regionsByDistance] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!lotsReady) return;
    lotsInitialized.current = false;
    updateVisibleLots();
  }, [lotsReady, lots, lastLotUpdate, crewLotMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sampledLotMap) return;
    lotsInitialized.current = false;
    updateVisibleLots();
  }, [sampledLotMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightLot = useCallback((lotId) => {
    highlighted.current = null;
    // if a new lotId was passed to highlight, do it
    if (lotId !== undefined && lotId !== selectedLotId) {
      if (!positions.current) return;
      const lotIndex = lotId - 1;

      mouseHoverMesh.current.position.set(
        positions.current[lotIndex * 3 + 0],
        positions.current[lotIndex * 3 + 1],
        positions.current[lotIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[lotIndex * 3 + 0],
        orientations.current[lotIndex * 3 + 1],
        orientations.current[lotIndex * 3 + 2]
      );

      orientation.applyQuaternion(attachTo.quaternion);
      mouseHoverMesh.current.lookAt(orientation);
      mouseHoverMesh.current.material.opacity = 0.5;
      highlighted.current = lotId;
    } else {
      mouseHoverMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedLotId]);

  const selectionAnimationTime = useRef(0);
  useEffect(() => {
    if (selectionMesh.current && positions.current && positionsReady && selectedLotId) {
      const lotIndex = selectedLotId - 1;

      selectionMesh.current.position.set(
        positions.current[lotIndex * 3 + 0],
        positions.current[lotIndex * 3 + 1],
        positions.current[lotIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[lotIndex * 3 + 0],
        orientations.current[lotIndex * 3 + 1],
        orientations.current[lotIndex * 3 + 2]
      );
      orientation.applyQuaternion(attachTo.quaternion);
      selectionMesh.current.lookAt(orientation);

      selectionAnimationTime.current = 0;
      selectionMesh.current.material.opacity = 1;
      mouseHoverMesh.current.material.opacity = 0;
    } else {
      selectionMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedLotId, positionsReady]);

  // useEffect(() => { // shouldn't be zoomed to lot when lots first loaded or unloaded
  //   dispatchLotSelected();
  //   dispatchZoomToLot();
  //   return () => {
  //     dispatchLotSelected();
  //     dispatchZoomToLot();
  //   };
  // }, []);

  // when camera angle changes, sort all regions by closest, then display
  // up to max lots (ordered by region proximity)
  //  NOTE: attempted to throttle this and wasn't catching any calculations even on huge, so pulled it out
  useEffect(() => {
    if (cameraNormalized?.string && regionTally > 1) {
      processInBackground(
        {
          topic: 'findClosestLots',
          data: {
            center: cameraNormalized.vector,
            lotTally: regionTally,
          }
        },
        (data) => {
          setRegionsByDistance(data.lots);
        }
      );
    } else if (!regionsByDistance?.length) {
      setRegionsByDistance([1]); // one-indexed so if only one region, it is #1
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraNormalized?.string, regionsByDistance?.length, regionTally]);

  useEffect(() => {
    if (!lastClick) return;
    dispatchLotSelected(asteroidId, highlighted.current);
  }, [lastClick]);


  useFrame((state, delta) => {
    selectionAnimationTime.current = (selectionAnimationTime.current || 0) + delta;
    
    // if no lots, nothing to do
    if (!lotTally) return;

    // pulse the size of the selection reticule
    if (selectionMesh.current && positions.current && selectedLotId) {
      selectionMesh.current.scale.x = 1 + 0.1 * Math.sin(7.5 * selectionAnimationTime.current);
      selectionMesh.current.scale.y = selectionMesh.current.scale.x;
    }

    // MOUSE STUFF

    // if mouse is out OR camera altitude is above MOUSE_VISIBILITY_ALTITUDE, clear any highlights
    if (mouseIsOut.current || cameraAltitude > MOUSE_VISIBILITY_ALTITUDE) { highlightLot(); return; }

    // if lastMouseIntersect.current is null, it is in the middle of finding the closest point, so return
    if (!lastMouseIntersect.current) return;

    // if lockedToSurface mode, state.mouse must have changed to be worth re-evaluating
    const mouseVector = state.pointer || state.mouse;
    if (getLockToSurface() && lastMouseUpdatePosition.current.equals(mouseVector)) return;

    // throttle by time as well
    const now = Date.now();
    if (now - lastMouseUpdateTime.current < MOUSE_THROTTLE_TIME) return;

    // FINALLY, find the closest intersection
    lastMouseUpdatePosition.current = mouseVector.clone();
    lastMouseUpdateTime.current = now;
    const intersections = state.raycaster.intersectObject(mouseableMesh.current);

    // if no intersections, clear any highlights
    if (!intersections || intersections.length === 0) { highlightLot(); return; }

    // find actual intersection location in space
    const intersection = intersections[0].point.clone();
    intersection.applyAxisAngle(axis, -1 * getRotation());
    intersection.divide(config.stretch);

    // if intersection is too close to last intersection, return without updating highlight
    // (distance-based throttling)
    if (intersection.distanceToSquared(lastMouseIntersect.current) < MOUSE_THROTTLE_DISTANCE) return;

    // if get here, find the closest fibo point to the intersection point, then highlight it
    lastMouseIntersect.current = null;
    processInBackground(
      {
        topic: 'findClosestLots',
        data: {
          center: intersection.clone().normalize(),
          findTally: 1,
          lotTally
        }
      },
      (data) => {
        highlightLot(data.lots[0]);
        lastMouseIntersect.current = intersection.clone();
      }
    )
  }, 0.5);

  return null;
};

export default Lots;
