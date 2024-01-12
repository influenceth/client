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
import { Asteroid, Entity, Lot } from '@influenceth/sdk';

import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import useWebWorker from '~/hooks/useWebWorker';
import useMappedAsteroidLots from '~/hooks/useMappedAsteroidLots';
import constants from '~/lib/constants';
import { getLotGeometryHeightMaps, getLotGeometryHeightMapResolution } from './helpers/LotGeometry';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useConstants from '~/hooks/useConstants';

const { MAX_LOTS_RENDERED } = constants;

const STROKE_COLOR = new Color().setHex(0xbbbbbb).convertSRGBToLinear();
const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();
const FILL_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const colorCache = {};
const getColor = (hex) => {
  if (!colorCache[hex]) {
    colorCache[hex] = new Color(hex).convertSRGBToLinear();
  }
  return colorCache[hex];
}

const PLOT_LOADER_GEOMETRY_PCT = 0.25;

const getMaxInstancesForAltitude = (altitude) => {
  return Math.round(2 * Math.pow(altitude * 2 * Math.tan(Math.PI * 35 / 180) / 1e3, 2));
}

const MOUSEABLE_WIDTH = 800;
const MAX_MESH_INSTANCES = MAX_LOTS_RENDERED;
const PIP_VISIBILITY_ALTITUDE = 25000;
const MOUSE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE;
const STROKE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.5;
const FILL_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.75;
const MAX_OUTLINE_INSTANCES = getMaxInstancesForAltitude(STROKE_VISIBILITY_ALTITUDE);
const MAX_FILL_INSTANCES = getMaxInstancesForAltitude(FILL_VISIBILITY_ALTITUDE);

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;
const MOUSE_THROTTLE_TIME = 1000 / 30; // ms

const isResultMask = 0b100000;
const hasBuildingMask = 0b010000;
const colorIndexMask  = 0b001111;

const Lots = ({ attachTo, asteroidId, axis, cameraAltitude, cameraNormalized, config, getLockToSurface, getRotation }) => {
  const { token } = useAuth();
  const { crew } = useCrewContext();
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const { gl, scene } = useThree();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const { processInBackground } = useWebWorker();
  const getActivityConfig = useGetActivityConfig();

  const textureQuality = useStore(s => s.graphics.textureQuality);
  const lotId = useStore(s => s.asteroids.lot);
  const dispatchLotsLoading = useStore(s => s.dispatchLotsLoading);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchSearchResults = useStore(s => s.dispatchLotsMappedSearchResults);

  const selectedLotIndex = useMemo(() => Lot.toIndex(lotId), [lotId]);

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);
  const [lastClick, setLastClick] = useState();

  const positions = useRef();
  const orientations = useRef();
  const lotsByRegion = useRef([]);
  const resultsByRegion = useRef([]);

  const pipMesh = useRef();
  const mouseableMesh = useRef();
  const resultMesh = useRef();

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

  // NOTE: for every dependency on `lotDataMap`, should also include `lastLotUpdate` so react triggers it
  //  (it seems react does not handle sparse arrays very well for equality checks)
  // const [lastLotUpdate, setLastLotUpdate] = useState();

  const {
    data: {
      buildingTally,
      fillTally,
      resultTally,
      lastLotUpdate,
      colorMap,
      lotDisplayMap,
      lotSampledMap,
    },
    isLoading,
    processEvent,
    refetch: refetchLots
  } = useMappedAsteroidLots(asteroidId);
  const lotsReady = !isLoading && lotDisplayMap;

  useEffect(() => {
    dispatchSearchResults({ total: resultTally, isLoading });
  }, [resultTally, isLoading])

  const lotTally = useMemo(() => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);
  const regionTally = useMemo(() => lotTally <= MAX_LOTS_RENDERED ? 1 : Asteroid.getLotRegionTally(lotTally), [lotTally]);
  const visibleLotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, lotTally), [lotTally]);
  const visibleStrokeTally = useMemo(() => Math.min(MAX_OUTLINE_INSTANCES, buildingTally), [buildingTally]);
  const visibleFillTally = useMemo(() => Math.min(MAX_FILL_INSTANCES, fillTally), [fillTally]);
  const visibleResultTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, resultTally), [resultTally]);

  // if just navigated to asteroid and lots already loaded, refetch
  // (b/c might have missed ws updates while on a different asteroid)
  // TODO: probably technically need to capture allLotsReloading / lotsReady alongside lastLotUpdate in dependency arrays
  useEffect(() => {
    if (lotDisplayMap) refetchLots();
  }, []);

  // position lots and bucket into regions (as needed)
  // BATCHED region bucketing is really only helpful for largest couple asteroids
  // NOTE: this just runs once when lots is initial populated
  useEffect(() => {
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
              const lotIndex = batchStart + i + 1;
              if (!lotsByRegion.current[region]) lotsByRegion.current[region] = [];
              lotsByRegion.current[region].push(lotIndex);
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
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  //  before declaring the lots "loaded" initially
  // run this when lots changes (after its initial run through the effect that follows this one)
  useEffect(() => {
    if (lotDisplayMap && lotsByRegion.current?.length) {
      Object.keys(lotsByRegion.current).forEach((region) => {
        resultsByRegion.current[region] = lotsByRegion.current[region].filter((lotIndex) => (lotDisplayMap[lotIndex] & isResultMask) > 0);
      });
    }
  }, [lotDisplayMap, lastLotUpdate]);

  const handleWSMessage = useCallback(({ type: eventType, body, ...props }) => {
    console.log('asteroid handleWSMessage', {eventType, body, props});

    // pass the event to useMappedAsteroidLots hook to update scene
    processEvent(eventType, body);

    // invalidate cached values due to other crews' actions
    // (since these will be missed in the main activities context invalidations)
    // TODO: ...


    //
    // UPDATE CACHE FOR SPECIFIC LOT VALUES
    //

    // (can skip those that are my own crew since those will be
    //  handled by crew-room activities context)
    // const activityConfig = getActivityConfig(activity);
    // (activityConfig?.invalidations || []).forEach((queryKey) => {

    // });

    // TODO: ecs refactor (below)

    // try to minimize redundant updates by just listening to Dispatcher_* events
    if (eventType.match(/^Dispatcher_/)) {
      // myCrew will handle their own invalidations through the default ws room
      const isMyCrew = crew?.id && body.linked.find(({ type, asset }) => type === 'Crew' && asset?.id === crew.id);
      if (!isMyCrew) {
        // find any lot data on this asteroid... if it is complete and in my cache, replace my cache value
        const optimisticLots = body.linked.filter(({ type, asset }) => type === 'Lot' && asset?.asteroid === asteroidId);
        optimisticLots.forEach(({ asset: optimisticLot }) => {
          const queryKey = ['entity', Entity.IDS.LOT, optimisticLot.id];
          if (!!queryClient.getQueryData(queryKey)) {
            const needsBuilding = !!optimisticLot.building;
            optimisticLot.building = body.linked
              .find(({ type, asset }) => type === optimisticLot.building?.type && asset?.id === optimisticLot.building?.id)
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

  }, [processEvent]);

  useEffect(() => {
    if (token && wsReady) {
      let roomName = `Asteroid::${asteroidId}`;
      registerWSHandler(handleWSMessage, roomName);
      return () => {
        unregisterWSHandler(roomName);

        // since will not be listening to asteroid room when zoomed away, remove ['asteroidLots', asteroidId]
        // and all [ 'entity', Entity.IDS.LOT, * ] that are on the asteroid but not occupied by me
        queryClient.removeQueries({ queryKey: [ 'asteroidLots', asteroidId ] });
        queryClient.getQueriesData([ 'entity', Entity.IDS.LOT ]).forEach(([ queryKey, data ]) => {
          const lotAsteroidId = Lot.toPosition(lotId)?.asteroidId;
          if (asteroidId === lotAsteroidId) {
            if (data && data.occupier !== crew?.id) { // TODO: ecs refactor -- occupier?
              queryClient.removeQueries({ queryKey });
            }
          }
        });
      }
    }
  }, [token, handleWSMessage, wsReady]);


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

    return () => {
      if (pipMesh.current) {
        (attachTo || scene).remove(pipMesh.current);
      }
    }
  }, [visibleLotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate (invisible) mouseable mesh (behind all pips)
  useEffect(() => {
    if (!visibleLotTally) return;

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
      if (mouseableMesh.current) {
        (attachTo || scene).remove(mouseableMesh.current);
      }
    };

  }, [visibleLotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate results mesh
  useEffect(() => {
    if (!visibleResultTally) return;

    const resultGeometry = new CircleGeometry(BUILDING_RADIUS, 6);
    // resultGeometry.rotateX(-Math.PI / 2);
    const resultMaterial = new MeshBasicMaterial({
      color: new Color().setHex(0xffffff),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: false,
    });

    resultMesh.current = new InstancedMesh(resultGeometry, resultMaterial, visibleResultTally);
    resultMesh.current.renderOrder = 999;
    resultMesh.current.userData.bloom = true;
    (attachTo || scene).add(resultMesh.current);

    return () => {
      if (resultMesh.current) {
        (attachTo || scene).remove(resultMesh.current);
      }
    };

  }, [visibleResultTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate lot outline mesh
  useEffect(() => {
    if (!visibleStrokeTally) return;

    // const strokeGeometry = new TorusGeometry(PLOT_WIDTH, 5, 3, 6);
    const strokeGeometry = new RingGeometry(PLOT_WIDTH, PLOT_WIDTH + PLOT_STROKE_MARGIN, 6, 1);
    const strokeMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: false,
    });

    lotStrokeMesh.current = new InstancedMesh(strokeGeometry, strokeMaterial, visibleStrokeTally);
    lotStrokeMesh.current.renderOrder = 999;
    (attachTo || scene).add(lotStrokeMesh.current);

    return () => {
      if (lotStrokeMesh.current) {
        (attachTo || scene).remove(lotStrokeMesh.current);
      }
    };
  }, [visibleStrokeTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate lot fill mesh
  // TODO: instantiate only in resource mode?
  useEffect(() => {
    if (!visibleFillTally) return;

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

    lotFillMesh.current = new InstancedMesh(fillGeometry, fillMaterial, visibleFillTally);
    lotFillMesh.current.renderOrder = 998;
    (attachTo || scene).add(lotFillMesh.current);

    return () => {
      if (lotFillMesh.current) {
        (attachTo || scene).remove(lotFillMesh.current);
      }
    };
  }, [visibleFillTally]);

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
    if (!resultsByRegion.current) return;
    try {
      const dummy = new Object3D();

      let resultsRendered = 0;
      let strokesRendered = 0;
      let fillsRendered = 0;
      let pipsRendered = 0;
      let breakLoop = false;

      let updateFillMatrix = false;
      let updatePipMatrix = false;
      let updateMouseableMatrix = false;
      let updateResultMatrix = false;
      let updateStrokeMatrix = false;
      let updateResultColor = false;
      let updateStrokeColor = false;

      // scale down results if in fill-mode and zoomed in pretty close (so can see fill)
      const resultScale = ((cameraAltitude < FILL_VISIBILITY_ALTITUDE && lotSampledMap) ? 0.5 : 1)
        * Math.max(1, Math.min(250 / BUILDING_RADIUS, cameraAltitude / 15000));

      let i = 0;
      regionsByDistance.every((lotRegion) => {
        // use lotsByRegion on first pass even if zoomed out so single-render asteroids are ready
        // else, use buildings-only source once have been through closest X lots (i.e. rendered all pips needed for this altitude)
        // (without this, imagine all the unnecessary loops if there were a single building on AP)
        const lotSource = (i < visibleLotTally && (cameraAltitude <= PIP_VISIBILITY_ALTITUDE || !lotsInitialized.current))
          ? lotsByRegion.current
          : resultsByRegion.current;
        if (!lotSource[lotRegion]) return true;

        // TODO (enhancement): on altitude change (where rotation has not changed), don't need to recalculate pip matrixes, etc
        //  (i.e. even when lotTally > visibleLotTally)... just would need to update result matrixes (to update scale)
        lotSource[lotRegion].every((lotIndex) => {
          const hasPip = (pipsRendered + resultsRendered) < visibleLotTally;
          const hasResult = (isResultMask & lotDisplayMap[lotIndex]) && (resultsRendered < visibleResultTally);
          const hasStroke = (hasBuildingMask & lotDisplayMap[lotIndex]) && (strokesRendered < visibleStrokeTally);
          const hasFill = lotSampledMap && lotSampledMap[lotIndex] && (fillsRendered < visibleFillTally);
          const hasMouseable = lotTally > visibleLotTally || !lotsInitialized.current;

          if (hasPip || hasResult || hasStroke || hasFill || hasMouseable) {

            // MATRIX
            // > if has a result, always need to rebuild entire matrix for this lot (to update scale with altitude)
            // > otherwise, only need to (re)build matrix on (re)initialization or if lot visibility is dynamic
            //   (note: building source and fill source changes will result in updated lastLotUpdate update)
            if (hasResult || lotTally > visibleLotTally || !lotsInitialized.current) {
              const lotZeroIndex = lotIndex - 1;

              dummy.position.set(
                positions.current[lotZeroIndex * 3 + 0],
                positions.current[lotZeroIndex * 3 + 1],
                positions.current[lotZeroIndex * 3 + 2]
              );

              dummy.lookAt(
                orientations.current[lotZeroIndex * 3 + 0],
                orientations.current[lotZeroIndex * 3 + 1],
                orientations.current[lotZeroIndex * 3 + 2]
              );

              // update building matrix or pip matrix
              if (hasResult) {
                dummy.scale.set(resultScale, resultScale, resultScale);
                dummy.updateMatrix();

                resultMesh.current.setMatrixAt(resultsRendered, dummy.matrix);
                updateResultMatrix = true;
              }

              // everything else is only in visible-lot area
              // (this should be redundant, but will at least save the dummy-rescaling to wrap)
              if (i < visibleLotTally) {

                // everything but buildings should be scaled to 1
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();

                // if no result, show pip
                if (hasPip && !hasResult) {
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
                  lotStrokeMesh.current.setMatrixAt(strokesRendered, dummy.matrix);
                  updateStrokeMatrix = true;
                }

                // update mouseable matrix
                // TODO: should these always face the camera? or have a slight bias towards camera at least?
                if (hasMouseable) {
                  mouseableMesh.current.setMatrixAt(i, dummy.matrix);
                  updateMouseableMatrix = true;
                }
              }
            }

            // COLOR
            // > if has a result, must always update color (because matrix always updated, so instance indexes will change position)
            // > pips never need color updated
            // > strokes use result color (if result) else pip color (only need to be updated after initialization if dynamic)
            let lotColor;
            if (hasResult) {
              lotColor = getColor(colorMap[colorIndexMask & lotDisplayMap[lotIndex]]);
              let testColor = new Color();
              try { resultMesh.current.getColorAt(resultsRendered, testColor); } catch {}
              if (!testColor.equals(lotColor)) {
                // if this is first color change to instance, need to let material know
                if (!resultMesh.current.instanceColor && !resultMesh.current.material.needsUpdate) {
                  resultMesh.current.material.needsUpdate = true;
                }

                // update color
                resultMesh.current.setColorAt(resultsRendered, lotColor);
                updateResultColor = true;
              }
            }

            if (hasStroke) {
              let strokeColor = lotColor || STROKE_COLOR;
              let testColor = new Color();
              try { lotStrokeMesh.current.getColorAt(strokesRendered, testColor); } catch {}
              if (!testColor.equals(strokeColor)) {
                // if this is first color change to instance, need to let material know
                if (!lotStrokeMesh.current.instanceColor && !lotStrokeMesh.current.material.needsUpdate) {
                  lotStrokeMesh.current.material.needsUpdate = true;
                }

                // update color
                lotStrokeMesh.current.setColorAt(strokesRendered, strokeColor);
                updateStrokeColor = true;
              }
            }
          }

          if (hasResult) {
            resultsRendered++;
          } else if (hasPip) {
            pipsRendered++;
          }
          if (hasStroke) {
            strokesRendered++;
          }
          if (hasFill) {
            fillsRendered++;
          }
          i++;

          // break loop if all visible results are rendered AND *something* is rendered on closest visibleLots
          breakLoop = (resultsRendered >= visibleResultTally && i >= visibleLotTally);

          if (breakLoop) return false;
          return true;
        });
        if (breakLoop) return false;
        return true;
      });

      if (pipMesh.current) pipMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : Math.min(pipsRendered, visibleLotTally);
      if (mouseableMesh.current) mouseableMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : visibleLotTally;
      if (lotFillMesh.current) lotFillMesh.current.count = cameraAltitude > FILL_VISIBILITY_ALTITUDE ? 0 : Math.min(fillsRendered, visibleFillTally);
      if (lotStrokeMesh.current) lotStrokeMesh.current.count = cameraAltitude > STROKE_VISIBILITY_ALTITUDE ? 0 : Math.min(strokesRendered, visibleStrokeTally);

      // console.log('i', i, strokesRendered, pipsRendered, pipMesh.current.count);

      // (result mesh isn't created if no results)
      if (resultMesh.current && updateResultColor) resultMesh.current.instanceColor.needsUpdate = true;
      if (resultMesh.current && updateResultMatrix) resultMesh.current.instanceMatrix.needsUpdate = true;
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
  }, [cameraAltitude, lastLotUpdate, lotDisplayMap, lotSampledMap, regionsByDistance]);

  useEffect(
    () => updateVisibleLots(),
    [chunkyAltitude, positionsReady, regionsByDistance] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!lotsReady) return;
    lotsInitialized.current = false;
    updateVisibleLots();
  }, [!lotsReady, lastLotUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightLot = useCallback((lotIndex) => {
    highlighted.current = null;
    // if a new lotIndex was passed to highlight, do it
    if (lotIndex !== undefined && lotIndex !== selectedLotIndex) {
      if (!positions.current) return;
      const lotZeroIndex = lotIndex - 1;

      mouseHoverMesh.current.position.set(
        positions.current[lotZeroIndex * 3 + 0],
        positions.current[lotZeroIndex * 3 + 1],
        positions.current[lotZeroIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[lotZeroIndex * 3 + 0],
        orientations.current[lotZeroIndex * 3 + 1],
        orientations.current[lotZeroIndex * 3 + 2]
      );

      orientation.applyQuaternion(attachTo.quaternion);
      mouseHoverMesh.current.lookAt(orientation);
      mouseHoverMesh.current.material.opacity = 0.5;
      highlighted.current = lotIndex;
    } else {
      mouseHoverMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedLotIndex]);

  const selectionAnimationTime = useRef(0);
  useEffect(() => {
    if (selectionMesh.current && positions.current && positionsReady && selectedLotIndex) {
      const lotZeroIndex = selectedLotIndex - 1;

      selectionMesh.current.position.set(
        positions.current[lotZeroIndex * 3 + 0],
        positions.current[lotZeroIndex * 3 + 1],
        positions.current[lotZeroIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[lotZeroIndex * 3 + 0],
        orientations.current[lotZeroIndex * 3 + 1],
        orientations.current[lotZeroIndex * 3 + 2]
      );
      orientation.applyQuaternion(attachTo.quaternion);
      selectionMesh.current.lookAt(orientation);

      selectionAnimationTime.current = 0;
      selectionMesh.current.material.opacity = 1;
      mouseHoverMesh.current.material.opacity = 0;
    } else {
      selectionMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedLotIndex, positionsReady]);

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
    dispatchLotSelected(Lot.toId(asteroidId, highlighted.current));
  }, [lastClick]);

  const mouseThrottleTime = useMemo(() => MOUSE_THROTTLE_TIME / (TIME_ACCELERATION / 24), [TIME_ACCELERATION]);

  useFrame((state, delta) => {
    selectionAnimationTime.current = (selectionAnimationTime.current || 0) + delta;
    
    // if no lots, nothing to do
    if (!lotTally) return;

    // pulse the size of the selection reticule
    if (selectionMesh.current && positions.current && selectedLotIndex) {
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
    if (now - lastMouseUpdateTime.current < mouseThrottleTime) return;

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
