import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CubicBezierCurve3,
  FrontSide,
  InstancedMesh,
  Line,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3
} from 'three';
import { useQueryClient } from 'react-query';
import { Asteroid, Building, Delivery, Entity, Lot } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import useWebWorker from '~/hooks/useWebWorker';
import useMappedAsteroidLots from '~/hooks/useMappedAsteroidLots';
import useDeliveries from '~/hooks/useDeliveries';
import useLot from '~/hooks/useLot';
import constants from '~/lib/constants';
import { getLotGeometryHeightMaps, getLotGeometryHeightMapResolution } from './helpers/LotGeometry';
import useConstants from '~/hooks/useConstants';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';

const { MAX_LOTS_RENDERED } = constants;

const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();
const GRAY_COLOR = new Color().setHex(0xaaaaaa).convertSRGBToLinear();

const colorCache = {};
const getColor = (hex) => {
  if (!hex) return GRAY_COLOR;
  if (!colorCache[hex]) colorCache[hex] = new Color(hex).convertSRGBToLinear();
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
const FILL_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.75;
const MAX_FILL_INSTANCES = getMaxInstancesForAltitude(FILL_VISIBILITY_ALTITUDE);

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;
const MOUSE_THROTTLE_TIME = 1000 / 30; // ms

const Lots = ({ attachTo, asteroidId, axis, cameraAltitude, cameraNormalized, config, getLockToSurface, getRotation }) => {
  const { token } = useSession();
  const { crew } = useCrewContext();
  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const { gl, scene } = useThree();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const { processInBackground } = useWebWorker();

  const textureQuality = useStore(s => s.graphics.textureQuality);
  const lotId = useStore(s => s.asteroids.lot);
  const dispatchLotsLoading = useStore(s => s.dispatchLotsLoading);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchSearchResults = useStore(s => s.dispatchLotsMappedSearchResults);

  const selectedLotIndex = useMemo(() => Lot.toIndex(lotId), [lotId]);
  const { data: lotDetails } = useLot(lotId);
  const { data: outboundDeliveries } = useDeliveries({ origin: lotDetails?.building, status: Delivery.STATUSES.SENT });
  const { data: inboundDeliveries } = useDeliveries({ destination: lotDetails?.building, status: Delivery.STATUSES.SENT });

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);
  const [lastClick, setLastClick] = useState();
  const [lotsInitialized, setLotsInitialized] = useState(false);
  const [meshesInitialized, setMeshesInitialized] = useState(false);

  const positions = useRef();
  const orientations = useRef();
  const lotsByRegion = useRef([]);
  const resultsByRegion = useRef([]);

  const mouseableMesh = useRef();
  const lotMeshes = useRef({});

  const textures = useTexture({
    [Building.IDS.WAREHOUSE]: `${process.env.PUBLIC_URL}/textures/buildings/Warehouse.png`,
    [Building.IDS.EXTRACTOR]: `${process.env.PUBLIC_URL}/textures/buildings/Extractor.png`,
    [Building.IDS.REFINERY]: `${process.env.PUBLIC_URL}/textures/buildings/Refinery.png`,
    [Building.IDS.BIOREACTOR]: `${process.env.PUBLIC_URL}/textures/buildings/Bioreactor.png`,
    [Building.IDS.FACTORY]: `${process.env.PUBLIC_URL}/textures/buildings/Factory.png`,
    [Building.IDS.SHIPYARD]: `${process.env.PUBLIC_URL}/textures/buildings/Shipyard.png`,
    [Building.IDS.SPACEPORT]: `${process.env.PUBLIC_URL}/textures/buildings/Spaceport.png`,
    [Building.IDS.MARKETPLACE]: `${process.env.PUBLIC_URL}/textures/buildings/Marketplace.png`,
    [Building.IDS.HABITAT]: `${process.env.PUBLIC_URL}/textures/buildings/Habitat.png`,
    14: `${process.env.PUBLIC_URL}/textures/buildings/Construction.png`,
    15: `${process.env.PUBLIC_URL}/textures/buildings/Ship.png`
  });

  const texturesLoaded = useMemo(() => {
    return Object.keys(textures) > 0;
  }, [textures]);

  const lotSamplesMesh = useRef();
  const lastMouseIntersect = useRef(new Vector3());
  const highlighted = useRef();
  const lotLoaderInterval = useRef();

  const mouseHoverMesh = useRef();
  const selectionMesh = useRef();
  const deliveryArcs = useRef([]);
  const deliveryUniforms = useRef({
    uTime: { value: 0 },
    uAlpha: { value: 1.0 },
    uCount: { value: 51 },
    uCol: { type: 'c', value: new Color('#20bde5').convertSRGBToLinear() },
  });

  const lastMouseUpdatePosition = useRef(new Vector2());
  const lastMouseUpdateTime = useRef(0);
  const mouseIsOut = useRef(false);
  const clickStatus = useRef();

  const PLOT_WIDTH = useMemo(() => Math.min(125, config?.radius / 25), [config?.radius]);
  const BUILDING_RADIUS = useMemo(() => 0.375 * PLOT_WIDTH, [PLOT_WIDTH]);
  const PIP_RADIUS = useMemo(() => 0.25 * PLOT_WIDTH, [PLOT_WIDTH]);
  const RETICULE_WIDTH = 5 * PLOT_WIDTH;

  const chunkyAltitude = useMemo(() => Math.round(cameraAltitude / 500) * 500, [cameraAltitude]);

  // NOTE: for every dependency on `lotDataMap`, should also include `lastLotUpdate` so react triggers it
  //  (it seems react does not handle sparse arrays very well for equality checks)
  // const [lastLotUpdate, setLastLotUpdate] = useState();

  const {
    data: {
      lotUseTallies,
      fillTally,
      resultTally,
      lastLotUpdate,
      colorMap,
      lotResultMap,
      lotUseMap,
      lotColorMap,
      lotSampledMap,
    },
    isLoading,
    processEvent,
    refetch: refetchLots
  } = useMappedAsteroidLots(asteroidId);

  useEffect(() => {
    dispatchSearchResults({ total: resultTally, isLoading });
  }, [resultTally, isLoading])

  const lotTally = useMemo(() => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);
  const regionTally = useMemo(() => lotTally <= MAX_LOTS_RENDERED ? 1 : Asteroid.getLotRegionTally(lotTally), [lotTally]);
  const visibleLotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, lotTally), [lotTally]);
  const visibleFillTally = useMemo(() => Math.min(MAX_FILL_INSTANCES, fillTally), [fillTally]);
  const visibleResultTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, resultTally), [resultTally]);

  // if just navigated to asteroid and lots already loaded, refetch
  // (b/c might have missed ws updates while on a different asteroid)
  // TODO: probably technically need to capture allLotsReloading alongside lastLotUpdate in dependency arrays
  useEffect(() => {
    if (lotResultMap) refetchLots();
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
            if (batchesProcessed === expectedBatches) setPositionsReady(true);
            dispatchLotsLoading(
              asteroidId,
              PLOT_LOADER_GEOMETRY_PCT + (1 - PLOT_LOADER_GEOMETRY_PCT) * batchesProcessed / expectedBatches
            );
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
    if (lotResultMap && lotsByRegion.current?.length && positionsReady) {
      Object.keys(lotsByRegion.current).forEach((region) => {
        resultsByRegion.current[region] = lotsByRegion.current[region].filter((lotIndex) => lotResultMap[lotIndex]);
      });
    }
  }, [lotResultMap, lastLotUpdate, positionsReady]);

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

    // TODO: ecs refactor (below) and re-enable

    // // try to minimize redundant updates by just listening to Dispatcher_* events
    // if (eventType.match(/^Dispatcher_/)) {
    //   // myCrew will handle their own invalidations through the default ws room
    //   const isMyCrew = crew?.id && body.linked.find(({ type, asset }) => type === 'Crew' && asset?.id === crew.id);
    //   if (!isMyCrew) {
    //     // find any lot data on this asteroid... if it is complete and in my cache, replace my cache value
    //     const optimisticLots = body.linked.filter(({ type, asset }) => type === 'Lot' && asset?.asteroid === asteroidId);
    //     optimisticLots.forEach(({ asset: optimisticLot }) => {
    //       const queryKey = ['entity', Entity.IDS.LOT, optimisticLot.id];
    //       if (!!queryClient.getQueryData(queryKey)) {
    //         const needsBuilding = !!optimisticLot.building;
    //         optimisticLot.building = body.linked
    //           .find(({ type, asset }) => type === optimisticLot.building?.type && asset?.id === optimisticLot.building?.id)
    //           ?.asset;
    //         if (!needsBuilding || !!optimisticLot.building) {
    //           queryClient.setQueryData(queryKey, optimisticLot);
    //         }
    //       }
    //     });
    //   }
    // }

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

  // Instantiate (invisible) mouseable mesh (behind all pips)
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

  // Lot meshes
  useEffect(() => {
    if (!visibleResultTally && texturesLoaded) return;

    const materialOpts = {
      color: new Color().setHex(0xffffff),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: true,
    };

    const meshes = {};
    const pipMaterial = new MeshBasicMaterial({ ...materialOpts, opacity: 0.6, color: GRAY_COLOR });
    meshes[0] = new InstancedMesh(new CircleGeometry(PIP_RADIUS, 6), pipMaterial, visibleLotTally);
    meshes[0].setColorAt(0, GRAY_COLOR);

    const plane = new PlaneGeometry(BUILDING_RADIUS * 5, BUILDING_RADIUS * 5);
    const uses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15];

    for (const use of uses) {
      const material = new MeshBasicMaterial({ map: textures[use], ...materialOpts });
      meshes[use] = new InstancedMesh(plane, material, lotUseTallies[use]);
      meshes[use].userData.bloom = true;
      meshes[use].setColorAt(0, new Color());
    }

    Object.values(meshes).forEach((mesh) => {
      mesh.renderOrder = 999;
      (attachTo || scene).add(mesh);
    });

    lotMeshes.current = meshes;
    setMeshesInitialized(true);

    return () => {
      Object.values(lotMeshes.current).forEach((mesh) => {
        (attachTo || scene).remove(mesh);
      });
    };
  }, [visibleResultTally, texturesLoaded, lotUseTallies?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create mesh for core samples
  useEffect(() => {
    if (!visibleFillTally) return;

    const fillGeometry = new CircleGeometry(PLOT_WIDTH * 1.5, 6);
    const fillMaterial = new MeshBasicMaterial({
      color: GRAY_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.5,
      side: FrontSide,
      toneMapped: false,
      transparent: true
    });

    lotSamplesMesh.current = new InstancedMesh(fillGeometry, fillMaterial, visibleFillTally);
    lotSamplesMesh.current.renderOrder = 998;
    (attachTo || scene).add(lotSamplesMesh.current);

    return () => {
      if (lotSamplesMesh.current) {
        (attachTo || scene).remove(lotSamplesMesh.current);
      }
    };
  }, [visibleFillTally, PLOT_WIDTH]);

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

  // Instantiate selection mesh
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

  const lotScale = useMemo(() => Math.max(1, cameraAltitude / 20000), [cameraAltitude]);
  const lotsReady = useMemo(() => {
    return !isLoading &&
      lotResultMap &&
      meshesInitialized &&
      positions.current &&
      regionsByDistance?.length &&
      lotsByRegion.current?.length &&
      resultsByRegion.current;
  }, [
    isLoading,
    lotResultMap,
    meshesInitialized,
    regionsByDistance
  ]);

  useEffect(() => {
    if (!lotsReady) return;

    try {
      const dummy = new Object3D();

      let lotUsesRendered = {};
      let updateLotUseMatrix = {};
      let updateResultColor = {};
      let updateSamplesMatrix = false;
      let updateMouseableMatrix = false;

      let pipsRendered = 0;
      let resultsRendered = 0;
      let samplesRendered = 0;
      let totalRendered = 0;

      let breakLoop = false;

      regionsByDistance.every((lotRegion) => {
        // use lotsByRegion on first pass even if zoomed out so single-render asteroids are ready
        // else, use results-only source once have been through closest X lots (i.e. rendered all pips needed for this altitude)
        // (without this, imagine all the unnecessary loops if there were a single search result on AP)
        const lotSource = (totalRendered < visibleLotTally && (cameraAltitude <= PIP_VISIBILITY_ALTITUDE || !lotsInitialized))
          ? lotsByRegion.current
          : resultsByRegion.current;
        if (!lotSource[lotRegion]) return true;

        // TODO (enhancement): on altitude change (where rotation has not changed), don't need to recalculate pip matrixes, etc
        //  (i.e. even when lotTally > visibleLotTally)... just would need to update result matrixes (to update scale)
        lotSource[lotRegion].every((lotIndex) => {
          const hasPip = (pipsRendered + resultsRendered) < visibleLotTally;
          const hasResult = lotResultMap[lotIndex] && (resultsRendered < visibleResultTally); // has result
          const hasSample = !!lotSampledMap[lotIndex]; // has fill
          const hasMouseable = lotTally > visibleLotTally || !lotsInitialized;

          const lotUse = lotUseMap[lotIndex] || 0;
          const lotUseRendered = lotUsesRendered[lotUse] || 0;

          if (hasPip || hasResult || hasSample || hasMouseable) {
            // MATRIX
            // > if has a result, always need to rebuild entire matrix for this lot (to update scale with altitude)
            // > otherwise, only need to (re)build matrix on (re)initialization or if lot visibility is dynamic
            //   (note: building source and fill source changes will result in updated lastLotUpdate update)
            if (hasResult || lotTally > visibleLotTally || !lotsInitialized) {
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

              dummy.scale.set(lotScale, lotScale, lotScale);
              dummy.updateMatrix();

              // everything else is only in visible-lot area
              if (lotUse !== 0 && (totalRendered < visibleLotTally || hasResult)) {
                lotMeshes.current[lotUse].setMatrixAt(lotUseRendered, dummy.matrix);
                lotUsesRendered[lotUse] = (lotUsesRendered[lotUse] || 0) + 1;
                updateLotUseMatrix[lotUse] = true;
              }

              if (lotUse === 0 && ((totalRendered < visibleLotTally && cameraAltitude <= PIP_VISIBILITY_ALTITUDE) || hasResult)) {
                lotMeshes.current[0].setMatrixAt(lotUseRendered, dummy.matrix);
                lotUsesRendered[0] = (lotUsesRendered[0] || 0) + 1;
                updateLotUseMatrix[0] = true;
              }

              // update mouseable matrix
              // TODO: should these always face the camera? or have a slight bias towards camera at least?
              mouseableMesh.current.setMatrixAt(totalRendered, dummy.matrix);
              updateMouseableMatrix = true;
            }

            // COLOR
            // > if has a result, must always update color (because matrix always updated, so instance indexes will change position)
            // > pips never need color updated
            // > strokes use result color (if result) else pip color (only need to be updated after initialization if dynamic)
            let currentColor = new Color();
            lotMeshes.current[lotUse].getColorAt(lotUseRendered, currentColor);
            const lotColor = getColor(colorMap[lotColorMap[lotIndex]]);

            if (!currentColor.equals(lotColor)) {
              lotMeshes.current[lotUse].setColorAt(lotUseRendered, lotColor);
              updateResultColor[lotUse] = true;
            }

            // FILL
            // > only need to update fill if it has a sample and is in visible fill area
            if (hasSample) {
              lotSamplesMesh.current.setMatrixAt(samplesRendered, dummy.matrix);
              updateSamplesMatrix = true;
            }
          }

          if (hasResult) resultsRendered++;
          if (!hasResult && hasPip) pipsRendered++;
          if (hasSample) samplesRendered++;
          totalRendered++;

          // break loop if all visible results are rendered AND *something* is rendered on closest visibleLots
          breakLoop = (resultsRendered >= visibleResultTally && totalRendered >= visibleLotTally);

          if (breakLoop) return false;
          return true;
        });

        if (breakLoop) return false;
        return true;
      });

      if (mouseableMesh.current) mouseableMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : visibleLotTally;
      if (mouseableMesh.current && updateMouseableMatrix) mouseableMesh.current.instanceMatrix.needsUpdate = true;

      if (lotSamplesMesh.current && updateSamplesMatrix) lotSamplesMesh.current.instanceMatrix.needsUpdate = true;
      if (lotSamplesMesh.current) lotSamplesMesh.current.count = visibleFillTally;

      for (const use in lotMeshes.current) {
        lotMeshes.current[use].count = lotUsesRendered[use] || 0;
        lotMeshes.current[use].instanceMatrix.needsUpdate = !!updateLotUseMatrix[use];
        lotMeshes.current[use].instanceColor.needsUpdate = !!updateResultColor[use];
      };

      setLotsInitialized(true);
    } catch (e) {
      // non-insignificant chance of this being mid-process when the asteroid is
      // changed, so needs to fail gracefully (i.e. if buildingMesh.current is unset)
      console.error(e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chunkyAltitude,
    cameraNormalized?.string,
    lastLotUpdate,
    lotsReady,
    meshesInitialized,
    positionsReady
  ]);

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

  // Calculates the control point for the delivery bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / config.radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [config]);

  // Handle turning on and off delivery arcs when a lot is selected
  useEffect(() => {
    const newDeliveries = [];
    const material = new ShaderMaterial({
      uniforms: deliveryUniforms.current,
      fragmentShader: frag,
      vertexShader: vert,
      transparent: true,
      depthWrite: false
    });

    if (outboundDeliveries && lotDetails?.building && positions.current && positionsReady) {
      outboundDeliveries.forEach((delivery) => {
        const maybeLot = delivery.Delivery?.dest?.Location?.locations.find(l => l.label === Entity.IDS.LOT);
        if (maybeLot?.id) newDeliveries.push({
          originIndex: selectedLotIndex,
          destinationIndex: Lot.toIndex(maybeLot.id)
        });
      });
    }

    if (inboundDeliveries && lotDetails?.building && positions.current && positionsReady) {
      inboundDeliveries.forEach((delivery) => {
        const maybeLot = delivery.Delivery?.dest?.Location?.locations.find(l => l.label === Entity.IDS.LOT);
        if (maybeLot?.id) newDeliveries.push({
          originIndex: Lot.toIndex(maybeLot.id),
          destinationIndex: selectedLotIndex
        });
      });
    }

    newDeliveries.forEach(({ originIndex, destinationIndex }) => {
      const originZeroIndex = originIndex - 1;
      const origin = new Vector3(
        positions.current[originZeroIndex * 3 + 0],
        positions.current[originZeroIndex * 3 + 1],
        positions.current[originZeroIndex * 3 + 2]
      );

      const destZeroIndex = destinationIndex - 1;
      const destination = new Vector3(
        positions.current[destZeroIndex * 3 + 0],
        positions.current[destZeroIndex * 3 + 1],
        positions.current[destZeroIndex * 3 + 2]
      );

      let distance;

      // This shouldn't be needed, but maybe somehow previous asteroid deliveries are still in state?
      try {
        distance = Asteroid.getLotDistance(asteroidId, originIndex, destinationIndex) * 1000;
      } catch (e) {
        return;
      }

      const curve = new CubicBezierCurve3(
        origin,
        calculateControlPoint(origin, destination, distance, 1/3),
        calculateControlPoint(origin, destination, distance, 2/3),
        destination
      );

      const geometry = new BufferGeometry().setFromPoints(curve.getPoints(50));
      const order = new Float32Array(Array(51).fill().map((_, i) => i+1));
      geometry.setAttribute('order', new BufferAttribute(order, 1));

      const curveGeom = new Line(geometry, material);
      (attachTo || scene).add(curveGeom);
      deliveryArcs.current.push(curveGeom);
    });

    return () => {
      deliveryArcs.current?.forEach((arc) => (attachTo || scene).remove(arc));
      deliveryArcs.current = [];
    };
  }, [selectedLotIndex, lotDetails, inboundDeliveries, outboundDeliveries]);

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

    // If delivery arcs present, animate them
    if (deliveryArcs.current && deliveryArcs.current.length) {
      const time = deliveryUniforms.current.uTime.value;
      deliveryUniforms.current.uTime.value = time + 1;
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
