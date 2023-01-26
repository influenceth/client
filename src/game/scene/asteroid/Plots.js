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

import useAsteroidPlots from '~/hooks/useAsteroidPlots';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';
import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';
import { getPlotGeometryHeightMaps } from './helpers/PlotGeometry';
import { useQueryClient } from 'react-query';
import useAsteroidCrewSamples from '~/hooks/useAsteroidCrewSamples';

const MAIN_COLOR = new Color(theme.colors.main).convertSRGBToLinear();
const STROKE_COLOR = new Color().setHex(0xbbbbbb).convertSRGBToLinear();
const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const FILL_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const PLOT_LOADER_GEOMETRY_PCT = 0.25;

const MOUSEABLE_WIDTH = 800;
const MAX_MESH_INSTANCES = 8000;  // TODO: maybe GPU dependent
const PIP_VISIBILITY_ALTITUDE = 25000;
const OUTLINE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.5;
const MOUSE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE;

const MAX_REGIONS = 5000;

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;
const MOUSE_THROTTLE_TIME = 1000 / 30; // ms

const Plots = ({ attachTo, asteroidId, axis, cameraAltitude, cameraNormalized, config, getLockToSurface, getRotation }) => {
  const { token } = useAuth();
  const { gl, scene } = useThree();
  const queryClient = useQueryClient();
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();
  const { processInBackground } = useWebWorker();

  const mapResourceId = useStore(s => s.asteroids.mapResourceId);
  const dispatchPlotsLoading = useStore(s => s.dispatchPlotsLoading);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const { plotId: selectedPlotId } = useStore(s => s.asteroids.plot || {});

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);
  const [lastClick, setLastClick] = useState();

  const positions = useRef();
  const orientations = useRef();
  const plotsByRegion = useRef([]);
  const buildingsByRegion = useRef([]);

  const pipMesh = useRef();
  const mouseableMesh = useRef();
  const buildingMesh = useRef();

  const plotStrokeMesh = useRef();
  const plotFillMesh = useRef();
  const lastMouseIntersect = useRef(new Vector3());
  const highlighted = useRef();
  const plotLoaderInterval = useRef();

  const mouseHoverMesh = useRef();
  const selectionMesh = useRef();
  const plotsInitialized = useRef();

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
  const plotTally = useMemo(() => Math.floor(4 * Math.PI * (config?.radiusNominal / 1000) ** 2), [config?.radiusNominal]);
  const visiblePlotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, plotTally), [plotTally]);
  const regionTally = useMemo(() => {
    if (plotTally < MAX_MESH_INSTANCES) return 1;
    return Math.min(MAX_REGIONS, Math.max(Math.ceil(plotTally / 100), 100));
  }, [plotTally]);

  const { data: plots, isLoading: allPlotsLoading, refetch: refetchPlots } = useAsteroidPlots(asteroidId, plotTally);
  const { data: crewPlots, isLoading: crewPlotsLoading } = useAsteroidCrewPlots(asteroidId);
  const { data: sampledPlots, isLoading: sampledPlotsLoading } = useAsteroidCrewSamples(asteroidId, mapResourceId);

  // NOTE: for every dependency on `plots`, should also include `lastPlotUpdate` so react triggers it
  //  (it seems react does not handle sparse arrays very well for equality checks)
  const [lastPlotUpdate, setLastPlotUpdate] = useState();

  const sampledPlotMap = useMemo(() => {
    if (sampledPlots) {
      return sampledPlots.reduce((acc, i) => { acc[i] = true; return acc; }, {});
    } else if (sampledPlotsLoading) {
      return {};
    }
    return null;
  }, [sampledPlots]);

  const crewPlotMap = useMemo(() => {
    if (crewPlotsLoading) return null;
    return (crewPlots || []).reduce((acc, p) => {
      acc[p.i] = true;
      return acc;
    }, {});
  }, [crewPlots, crewPlotsLoading]);
  const plotsReady = (!allPlotsLoading && !crewPlotsLoading && !!crewPlotMap);
  const buildingTally = useMemo(() => plots && Object.values(plots).reduce((acc, cur) => acc + (cur > 0 ? 1 : 0), 0), [plots, lastPlotUpdate]);
  const visibleBuildingTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, buildingTally), [buildingTally]);

  // if just navigated to asteroid and plots already loaded, refetch
  // (b/c might have missed ws updates while on a different asteroid)
  // TODO: probably technically need to capture allPlotsReloading / plotsReady alongside lastPlotUpdate in dependency arrays
  useEffect(() => {
    if (plots) refetchPlots();
  }, []);

  // position plots and bucket into regions (as needed)
  // BATCHED region bucketing is really only helpful for largest couple asteroids
  // NOTE: this just runs once when plots is initial populated
  useEffect(() => {
    if (!plots) return;

    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    const batchSize = 25000;
    const expectedBatches = Math.ceil(plotTally / batchSize);

    // (if no offscreencanvas, need to render heightmaps before sending to webworker)
    let heightMaps = null;
    let transfer = [];
    if (typeof OffscreenCanvas === 'undefined') {
      heightMaps = getPlotGeometryHeightMaps(prunedConfig);
      transfer = heightMaps.map((m) => m.buffer.buffer);
    }

    if (plotLoaderInterval.current) clearInterval(plotLoaderInterval.current);
    plotLoaderInterval.current = setInterval(() => {
      dispatchPlotsLoading(asteroidId, 0, PLOT_LOADER_GEOMETRY_PCT)
    }, 250);

    // vvv BENCHMARK: 1400ms on AP, 350ms on 8, 200ms on 800
    //                1200, 170, 40 if maps already generated
    processInBackground(
      {
        topic: 'buildPlotGeometry',
        asteroid: {
          key: asteroidId,
          config: prunedConfig,
        },
        aboveSurface: 0,
        heightMaps,
        _cacheable: 'asteroid'
      },
      (data) => {
        // ^^^
        if (plotLoaderInterval.current) clearInterval(plotLoaderInterval.current);

        // vvv BENCHMARK: 1400ms on AP, 150ms on 8, 19ms on 800
        positions.current = data.positions;
        orientations.current = data.orientations;
        plotsByRegion.current = [];

        let batchesProcessed = 0;
        for (let batchStart = 0; batchStart < plotTally; batchStart += batchSize) {
          const batchPositions = data.positions.slice(batchStart * 3, (batchStart + batchSize) * 3);
          processInBackground({
            topic: 'buildPlotRegions',
            data: {
              positions: batchPositions,
              regionTally
            }
          }, ({ regions }) => { // eslint-disable-line no-loop-func
            regions.forEach((region, i) => {
              const plotId = batchStart + i + 1;
              if (!plotsByRegion.current[region]) plotsByRegion.current[region] = [];
              plotsByRegion.current[region].push(plotId);

              // (if there is building data) if there is a building, also add to building region records
              if (plots[plotId]) {
                if (!buildingsByRegion.current[region]) buildingsByRegion.current[region] = [];
                buildingsByRegion.current[region].push(plotId);
              }
            });
            batchesProcessed++;
            if (batchesProcessed === expectedBatches) {
              // console.log('positionsready');
              // ^^^
              setPositionsReady(true);
            }
            dispatchPlotsLoading(asteroidId, PLOT_LOADER_GEOMETRY_PCT + (1 - PLOT_LOADER_GEOMETRY_PCT) * batchesProcessed / expectedBatches);
          }, [
            batchPositions.buffer
          ]);
        }
      },
      transfer
    );
  }, [!plots]); // eslint-disable-line react-hooks/exhaustive-deps

  // run this when plots changes (after its initial run through the effect that follows this one)
  useEffect(() => {
    if (plots && plotsByRegion.current?.length) {
      Object.keys(plotsByRegion.current).forEach((region) => {
        buildingsByRegion.current[region] = plotsByRegion.current[region].filter((plotId) => plots[plotId] > 0);
      });
    }
  }, [plots, lastPlotUpdate]);

  const handleWSMessage = useCallback(({ type, body }) => {
    // if lot occupied or lot unoccupied, update plots by updating querycache
    switch (type) {
      case 'Lot_Occupied': {
        queryClient.setQueryData([ 'asteroidPlots', body.returnValues.asteroidId ], (currentPlotsValue) => {
          if (body.returnValues.crewId > 0) {
            currentPlotsValue[body.returnValues.lotId] = true;
          } else {
            delete currentPlotsValue[body.returnValues.lotId];
          }
          return currentPlotsValue;
        });
        setLastPlotUpdate(Date.now());
      }
    }
  }, []);

  useEffect(() => {
    if (token && wsReady) {
      let roomName = `Asteroid::${asteroidId}`;
      registerWSHandler(handleWSMessage, roomName)
      return () => {
        unregisterWSHandler(roomName)
      }
    }
  }, [token, wsReady]);

  // instantiate pips mesh
  useEffect(() => {
    if (!visiblePlotTally) return;

    const pipGeometry = new CircleGeometry(PIP_RADIUS, 6);
    const pipMaterial = new MeshBasicMaterial({
      color: WHITE_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.6,
      toneMapped: false,
      transparent: true,
    });

    pipMesh.current = new InstancedMesh(pipGeometry, pipMaterial, visiblePlotTally);
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

    mouseableMesh.current = new InstancedMesh(mouseableGeometry, mouseableMaterial, visiblePlotTally);
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

  }, [visiblePlotTally]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // instantiate plot outline mesh
  useEffect(() => {
    if (!visiblePlotTally) return;

    // const strokeGeometry = new TorusGeometry(PLOT_WIDTH, 5, 3, 6);
    const strokeGeometry = new RingGeometry(PLOT_WIDTH, PLOT_WIDTH + PLOT_STROKE_MARGIN, 6, 1);
    const strokeMaterial = new MeshBasicMaterial({
      color: STROKE_COLOR,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      transparent: false,
    });

    plotStrokeMesh.current = new InstancedMesh(strokeGeometry, strokeMaterial, visiblePlotTally);
    plotStrokeMesh.current.renderOrder = 999;
    (attachTo || scene).add(plotStrokeMesh.current);

    return () => {
      if (plotStrokeMesh.current) {
        (attachTo || scene).remove(plotStrokeMesh.current);
      }
    };
  }, [visiblePlotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate plot fill mesh
  // TODO: instantiate only in resource mode? 
  useEffect(() => {
    if (!visiblePlotTally) return;

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

    plotFillMesh.current = new InstancedMesh(fillGeometry, fillMaterial, visiblePlotTally);
    plotFillMesh.current.renderOrder = 998;
    (attachTo || scene).add(plotFillMesh.current);

    return () => {
      if (plotFillMesh.current) {
        (attachTo || scene).remove(plotFillMesh.current);
      }
    };
  }, [visiblePlotTally]);

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

  const updateVisiblePlots = useCallback(() => {
    if (!positions.current) return;
    if (!regionsByDistance?.length) return;
    if (!plotsByRegion.current?.length) return;
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
      const buildingScale = ((cameraAltitude < OUTLINE_VISIBILITY_ALTITUDE && sampledPlotMap) ? 0.5 : 1)
        * Math.max(1, Math.min(250 / BUILDING_RADIUS, cameraAltitude / 15000));

      let i = 0;
      regionsByDistance.every((plotRegion) => {
        // use plotsByRegion on first pass even if zoomed out so single-render asteroids are ready
        // else, use buildings-only source once have been through closest X plots (i.e. rendered all pips needed for this altitude)
        // (without this, imagine all the unnecessary loops if there were a single building on AP)
        const plotSource = i < visiblePlotTally && (cameraAltitude <= PIP_VISIBILITY_ALTITUDE || !plotsInitialized.current)
          ? plotsByRegion.current
          : buildingsByRegion.current;
        if (!plotSource[plotRegion]) return true;

        // TODO (enhancement): on altitude change (where rotation has not changed), don't need to recalculate pip matrixes, etc
        //  (i.e. even when plotTally > visiblePlotTally)... just would need to update building matrixes (to update scale)
        plotSource[plotRegion].every((plotId) => {
          const hasBuilding = (plots[plotId] || crewPlotMap[plotId]) && (buildingsRendered < visibleBuildingTally);
          const hasPip = (pipsRendered + buildingsRendered) < visiblePlotTally;
          const hasFill = sampledPlotMap && sampledPlotMap[plotId] && (fillsRendered < visibleBuildingTally);
          const hasMouseable = plotTally > visiblePlotTally || !plotsInitialized.current;
          const hasStroke = plotTally > visiblePlotTally || !plotsInitialized.current;
          if (hasBuilding || hasPip || hasMouseable || hasFill) {

            // MATRIX
            // > if have a building, always need to rebuild entire matrix (to update scale with altitude)
            // > if have a pip, only need to rebuild matrix if plot visibility is dynamic (i.e. plotTally > visiblePlotTally)
            // > if have fill, only need to rebuild if fill source has changed (listen to plotsInitialized)
            // > mouseable, stroke, and fill matrix will not change unless pip matrix does (but will need to change around buildings and pips)
            if (hasBuilding || plotTally > visiblePlotTally || !plotsInitialized.current) {
              const plotIndex = plotId - 1;

              dummy.position.set(
                positions.current[plotIndex * 3 + 0],
                positions.current[plotIndex * 3 + 1],
                positions.current[plotIndex * 3 + 2]
              );

              dummy.lookAt(
                orientations.current[plotIndex * 3 + 0],
                orientations.current[plotIndex * 3 + 1],
                orientations.current[plotIndex * 3 + 2]
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
                plotFillMesh.current.setMatrixAt(fillsRendered, dummy.matrix);
                updateFillMatrix = true;
              }

              // update stroke matrix
              if (hasStroke) {
                plotStrokeMesh.current.setMatrixAt(i, dummy.matrix);
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
            let plotColor;
            if (hasBuilding) {
              // white if occupied by me; else, blue
              plotColor = crewPlotMap[plotId] ? WHITE_COLOR : MAIN_COLOR;
            }
            if (hasBuilding && (!!crewPlotMap || !plotsInitialized.current)) {
              // if this is first color change to instance, need to let material know
              // TODO (enhancement): could check if there is a color change against existing buildingMesh instanceColor before setting updateBuildingColor
              if (!buildingMesh.current.instanceColor && !buildingMesh.current.material.needsUpdate) {
                buildingMesh.current.material.needsUpdate = true;
              }
              buildingMesh.current.setColorAt(buildingsRendered, plotColor);
              updateBuildingColor = true;
            }
            if (plotTally > visiblePlotTally || !plotsInitialized.current) {
              // if this is first color change to instance, need to let material know
              if (!plotStrokeMesh.current.instanceColor && !plotStrokeMesh.current.material.needsUpdate) {
                plotStrokeMesh.current.material.needsUpdate = true;
              }
              // if (hasFill) {
              //   plotStrokeMesh.current.setColorAt(i, FILL_COLOR);
              // } else 
              plotStrokeMesh.current.setColorAt(i, plotColor || STROKE_COLOR);
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

          // break loop if all visible buildings are rendered AND *something* is rendered on closest visiblePlots
          breakLoop = (buildingsRendered >= visibleBuildingTally && (pipsRendered + buildingsRendered) >= visiblePlotTally);

          if (breakLoop) return false;
          return true;
        });
        if (breakLoop) return false;
        return true;
      });
      pipMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : Math.min(pipsRendered, visiblePlotTally);
      plotFillMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : Math.min(fillsRendered, visiblePlotTally);
      mouseableMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : visiblePlotTally;
      plotStrokeMesh.current.count = cameraAltitude > OUTLINE_VISIBILITY_ALTITUDE ? 0 : visiblePlotTally;
      // console.log('i', i, buildingsRendered, pipsRendered, pipMesh.current.count);

      // (building mesh isn't created if no buildings)
      if (buildingMesh.current && updateBuildingColor) buildingMesh.current.instanceColor.needsUpdate = true;
      if (buildingMesh.current && updateBuildingMatrix) buildingMesh.current.instanceMatrix.needsUpdate = true;
      if (pipMesh.current && updatePipMatrix) pipMesh.current.instanceMatrix.needsUpdate = true;
      if (mouseableMesh.current && updateMouseableMatrix) mouseableMesh.current.instanceMatrix.needsUpdate = true;
      if (plotFillMesh.current && updateFillMatrix) plotFillMesh.current.instanceMatrix.needsUpdate = true;
      if (plotStrokeMesh.current && updateStrokeColor) plotStrokeMesh.current.instanceColor.needsUpdate = true;
      if (plotStrokeMesh.current && updateStrokeMatrix) plotStrokeMesh.current.instanceMatrix.needsUpdate = true;

      plotsInitialized.current = true;

      // console.log('data', data.debugs);
      // if (data.debugs) {
      //   const pointsGeometry = new BufferGeometry();
      //   pointsGeometry.setAttribute('position', new BufferAttribute(data.debugs, 3));
      //   plotMesh.current = new Points(
      //     pointsGeometry,
      //     new PointsMaterial({
      //       color: 'white',
      //       size: 20,
      //       sizeAttenuation: true
      //     })
      //   );
      //   plotMesh.current.userData.bloom = true;
      // }
      // scene.add(plotMesh.current);
    } catch (e) {
      // non-insignificant chance of this being mid-process when the asteroid is
      // changed, so needs to fail gracefully (i.e. if buildingMesh.current is unset)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAltitude, plots, lastPlotUpdate, crewPlotMap, sampledPlotMap, regionsByDistance]);

  useEffect(
    () => updateVisiblePlots(),
    [chunkyAltitude, positionsReady, regionsByDistance] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!plotsReady) return;
    plotsInitialized.current = false;
    updateVisiblePlots();
  }, [plotsReady, plots, lastPlotUpdate, crewPlotMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sampledPlotMap) return;
    plotsInitialized.current = false;
    updateVisiblePlots();
  }, [sampledPlotMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightPlot = useCallback((plotId) => {
    highlighted.current = null;
    // if a new plotId was passed to highlight, do it
    if (plotId !== undefined && plotId !== selectedPlotId) {
      if (!positions.current) return;
      const plotIndex = plotId - 1;

      mouseHoverMesh.current.position.set(
        positions.current[plotIndex * 3 + 0],
        positions.current[plotIndex * 3 + 1],
        positions.current[plotIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[plotIndex * 3 + 0],
        orientations.current[plotIndex * 3 + 1],
        orientations.current[plotIndex * 3 + 2]
      );

      orientation.applyQuaternion(attachTo.quaternion);
      mouseHoverMesh.current.lookAt(orientation);
      mouseHoverMesh.current.material.opacity = 0.5;
      highlighted.current = plotId;
    } else {
      mouseHoverMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedPlotId]);

  const selectionAnimationTime = useRef();
  useEffect(() => {
    if (selectionMesh.current && positions.current && positionsReady && selectedPlotId) {
      const plotIndex = selectedPlotId - 1;

      selectionMesh.current.position.set(
        positions.current[plotIndex * 3 + 0],
        positions.current[plotIndex * 3 + 1],
        positions.current[plotIndex * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[plotIndex * 3 + 0],
        orientations.current[plotIndex * 3 + 1],
        orientations.current[plotIndex * 3 + 2]
      );
      orientation.applyQuaternion(attachTo.quaternion);
      selectionMesh.current.lookAt(orientation);

      selectionAnimationTime.current = 0;
      selectionMesh.current.material.opacity = 1;
      mouseHoverMesh.current.material.opacity = 0;
    } else {
      selectionMesh.current.material.opacity = 0;
    }
  }, [attachTo.quaternion, selectedPlotId, positionsReady]);

  // useEffect(() => { // shouldn't be zoomed to plot when plots first loaded or unloaded
  //   dispatchPlotSelected();
  //   dispatchZoomToPlot();
  //   return () => {
  //     dispatchPlotSelected();
  //     dispatchZoomToPlot();
  //   };
  // }, []);

  // when camera angle changes, sort all regions by closest, then display
  // up to max plots (ordered by region proximity)
  //  NOTE: attempted to throttle this and wasn't catching any calculations even on huge, so pulled it out
  useEffect(() => {
    if (cameraNormalized?.string && regionTally > 1) {
      processInBackground(
        {
          topic: 'findClosestPlots',
          data: {
            center: cameraNormalized.vector,
            plotTally: regionTally,
          }
        },
        (data) => {
          setRegionsByDistance(data.plots);
        }
      );
    } else if (!regionsByDistance?.length) {
      setRegionsByDistance([1]); // one-indexed so if only one region, it is #1
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraNormalized?.string, regionsByDistance?.length, regionTally]);

  useEffect(() => {
    if (!lastClick) return;
    dispatchPlotSelected(asteroidId, highlighted.current);
  }, [lastClick]);


  useFrame((state, delta) => {
    selectionAnimationTime.current += delta;

    // if no plots, nothing to do
    if (!plotTally) return;

    // pulse the size of the selection reticule
    if (selectionMesh.current && positions.current && selectedPlotId) {
      selectionMesh.current.scale.x = 1 + 0.1 * Math.sin(7.5 * selectionAnimationTime.current);
      selectionMesh.current.scale.y = selectionMesh.current.scale.x;
    }

    // MOUSE STUFF

    // if mouse is out OR camera altitude is above MOUSE_VISIBILITY_ALTITUDE, clear any highlights
    if (mouseIsOut.current || cameraAltitude > MOUSE_VISIBILITY_ALTITUDE) { highlightPlot(); return; }

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
    if (!intersections || intersections.length === 0) { highlightPlot(); return; }

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
        topic: 'findClosestPlots',
        data: {
          center: intersection.clone().normalize(),
          findTally: 1,
          plotTally
        }
      },
      (data) => {
        highlightPlot(data.plots[0]);
        lastMouseIntersect.current = intersection.clone();
      }
    )
  }, 0.5);

  return null;
};

export default Plots;
