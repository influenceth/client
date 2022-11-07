import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CircleGeometry,
  Color,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  TorusGeometry,
  Vector3
} from 'three';

import useAsteroidPlots from '~/hooks/useAsteroidPlots';
import useAuth from '~/hooks/useAuth';
import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';

const MAIN_COLOR = new Color(theme.colors.main).convertSRGBToLinear();
const PIP_COLOR = new Color().setHex(0x888888).convertSRGBToLinear();
const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const MAX_MESH_INSTANCES = 8000;  // TODO: maybe GPU dependent
const PIP_VISIBILITY_ALTITUDE = 25000;
const OUTLINE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.5;
const MOUSE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE;

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;

const Plots = ({ attachTo, asteroidId, cameraAltitude, cameraNormalized, config, mouseIntersect }) => {
  const { account } = useAuth();
  const { scene } = useThree();
  const { processInBackground } = useWebWorker();

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);

  const positions = useRef();
  const orientations = useRef();
  const plotsByRegion = useRef([]);
  const buildingsByRegion = useRef([]);

  const pipMesh = useRef();
  const buildingMesh = useRef();

  const plotStrokeMesh = useRef();
  // const plotFillMesh = useRef();
  const lastMouseIntersect = useRef(new Vector3());
  const highlighted = useRef();

  // const PLOT_WIDTH = useMemo(() => 125, [config?.radius]);
  const PLOT_WIDTH = useMemo(() => Math.min(150, config?.radius / 25), [config?.radius]);
  const PLOT_STROKE_MARGIN = useMemo(() => 0.125 * PLOT_WIDTH, [PLOT_WIDTH]);
  const BUILDING_RADIUS = useMemo(() => 0.375 * PLOT_WIDTH, [PLOT_WIDTH]);
  const PIP_RADIUS = useMemo(() => 0.25 * PLOT_WIDTH, [PLOT_WIDTH]);

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * (config?.radiusNominal / 1000) ** 2), [config?.radiusNominal]);
  const visiblePlotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, plotTally), [plotTally]);
  const regionTally = useMemo(() => {
    if (plotTally < MAX_MESH_INSTANCES) return 1;
    return Math.min(5000, Math.max(Math.ceil(plotTally / 100), 100));
  }, [plotTally]);

  // TODO: when this is real, only needs origin, and can move back to top
  const { data: plotData } = useAsteroidPlots(asteroidId, plotTally);
  // ^^^

  const buildingTally = useMemo(() => plotData?.plots && Object.values(plotData?.plots).reduce((acc, cur) => acc + (cur && cur[1] > 0 ? 1 : 0), 0), [plotData?.plots]);
  const visibleBuildingTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, buildingTally), [buildingTally]);

  // position plots and bucket into regions (as needed)
  // BATCHED region bucketing is really only helpful for largest couple asteroids
  useEffect(() => {
    if (!plotData?.plots) return;

    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    const batchSize = 25000;
    const expectedBatches = Math.ceil(plotTally / batchSize);

    // TODO: need to support DISABLE_BACKGROUND_TERRAIN_MAPS here (i.e. if OffscreenCanvas is not allowed, must generate textures on main thread)
    // vvv BENCHMARK: 1400ms on AP, 250ms on 8, 40ms on 800
    processInBackground(
      {
        topic: 'buildPlotGeometry',
        asteroid: {
          key: asteroidId,
          config: prunedConfig,
        },
        aboveSurface: 0,
        _cacheable: 'asteroid'
      },
      (data) => {
        // ^^^
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
              const plotId = batchStart + i;
              if (!plotsByRegion.current[region]) plotsByRegion.current[region] = [];
              plotsByRegion.current[region].push(plotId);

              // (if there is building data) if there is a building, also add to building region records
              if (plotData?.plots) {
                if (plotData.plots[plotId] && plotData.plots[plotId][1]) {
                  if (!buildingsByRegion.current[region]) buildingsByRegion.current[region] = [];
                  buildingsByRegion.current[region].push(plotId);
                }
              }
            });
            batchesProcessed++;
            if (batchesProcessed === expectedBatches) {
              // ^^^
              setPositionsReady(true);
            }
          }, [
            batchPositions.buffer
          ]);
        }
      }
    );
  }, [plotData?.plots]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate pips mesh
  useEffect(() => {
    if (!visiblePlotTally) return;

    const pipGeometry = new CircleGeometry(PIP_RADIUS, 6);
    const pipMaterial = new MeshBasicMaterial({
      color: WHITE_COLOR,
      depthTest: false,
      depthWrite: false,
      opacity: 0.2,
      toneMapped: false,
      transparent: true,
    });

    pipMesh.current = new InstancedMesh(pipGeometry, pipMaterial, visiblePlotTally);
    pipMesh.current.renderOrder = 999;
    (attachTo || scene).add(pipMesh.current);

    return () => {
      if (pipMesh.current) {
        (attachTo || scene).remove(pipMesh.current);
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
      color: new Color('#ffffff'),
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

    //   const fillGeometry = new CircleGeometry(PLOT_WIDTH - PLOT_STROKE_MARGIN, 6);
    //   const fillMaterial = new MeshBasicMaterial({
    //     color: new Color('#ffffff'),
    //     opacity: 0.25,
    //     side: DoubleSide,
    //     toneMapped: false,
    //     transparent: true
    //   });

  }, [visiblePlotTally]); // eslint-disable-line react-hooks/exhaustive-deps

  // instantiate mouse mesh
  useEffect(() => {
    // const geometry = new RingGeometry(2 * PLOT_WIDTH, 2 * PLOT_WIDTH + PLOT_STROKE_MARGIN, 16, 1);
    const geometry = new TorusGeometry(1.5 * PLOT_WIDTH, 0.75 * PLOT_STROKE_MARGIN, 10, 32);
    // const geometry = new CircleGeometry(2 * PLOT_WIDTH, 6);
    // geometry.rotateX(-Math.PI / 2);

    mouseMesh.current = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color: WHITE_COLOR,
        depthTest: false,
        depthWrite: false,
        opacity: 0,
        toneMapped: false,
        transparent: true,
      })
    );
    mouseMesh.current.renderOrder = 999;
    mouseMesh.current.userData.bloom = true;
    (attachTo || scene).add(mouseMesh.current);
    return () => {
      if (mouseMesh.current) {
        (attachTo || scene).remove(mouseMesh.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chunkyAltitude = useMemo(() => Math.round(cameraAltitude / 500) * 500, [cameraAltitude]);

  const plotsInitialized = useRef();
  const updateVisiblePlots = useCallback(() => {
    if (!positions.current) return;
    if (!regionsByDistance?.length) return;
    if (!plotsByRegion.current?.length) return;
    if (!buildingsByRegion.current) return;
    try {
      const dummy = new Object3D();

      let buildingsRendered = 0;
      let pipsRendered = 0;
      let breakLoop = false;

      let updateBuildingMatrix = false;
      let updatePipMatrix = false;
      let updateStrokeMatrix = false;
      let updateBuildingColor = false;
      let updateStrokeColor = false;

      const buildingScale = Math.max(1, Math.min(250 / BUILDING_RADIUS, cameraAltitude / 15000));

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
          const hasBuilding = plotData.plots[plotId] && plotData.plots[plotId][1] && buildingsRendered < visibleBuildingTally;
          const hasPip = pipsRendered + buildingsRendered < visiblePlotTally;
          if (hasBuilding || hasPip) {

            // MATRIX
            // > if have a building, always need to rebuild entire matrix (to update scale with altitude)
            // > if have a pip, only need to rebuild matrix if plot visibility is dynamic (i.e. plotTally > visiblePlotTally)
            // > stroke matrix will not change unless pip matrix does (but will need to change around buildings and pips)
            if (hasBuilding || plotTally > visiblePlotTally || !plotsInitialized.current) {
              dummy.position.set(
                positions.current[plotId * 3 + 0],
                positions.current[plotId * 3 + 1],
                positions.current[plotId * 3 + 2]
              );
        
              dummy.lookAt(
                orientations.current[plotId * 3 + 0],
                orientations.current[plotId * 3 + 1],
                orientations.current[plotId * 3 + 2]
              );

              if (hasBuilding) {
                dummy.scale.set(buildingScale, buildingScale, buildingScale);
              } else {
                dummy.scale.set(1, 1, 1);
              }
              dummy.updateMatrix();

              // update building matrix or pip matrix
              if (hasBuilding) {
                buildingMesh.current.setMatrixAt(buildingsRendered, dummy.matrix);
                updateBuildingMatrix = true;
              } else {
                pipMesh.current.setMatrixAt(pipsRendered, dummy.matrix);
                updatePipMatrix = true;
              }

              // update stroke matrix
              if (plotTally > visiblePlotTally || !plotsInitialized.current) {
                if (hasBuilding) {
                  dummy.scale.set(1, 1, 1);
                  dummy.updateMatrix();
                }
                plotStrokeMesh.current.setMatrixAt(i, dummy.matrix);
                updateStrokeMatrix = true;
              }
            }

            // COLOR
            // > if have a building, only need to update color after initialization if buildingTally > visibleBuildingTally
            // > pips never need color updated
            // > strokes use building color (if building) else pip color (only need to be updated after initialization if dynamic)
            let plotColor = PIP_COLOR;
            if (hasBuilding) {
              // white if rented by me OR i am the owner and !rented by other; else, blue
              // TODO: need to re-evaluate this on auth change
              plotColor = (
                (plotData.owner === `${account}` && plotData.plots[plotId][0] !== 2)  // owned by me and not rented out
                || plotData.plots[plotId][0] === 1                                    // OR rented by me
              ) ? WHITE_COLOR : MAIN_COLOR;
            }
            if (hasBuilding && (buildingTally > visibleBuildingTally || !plotsInitialized.current)) {
              // if this is first color change to instance, need to let material know
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
              plotStrokeMesh.current.setColorAt(i, plotColor);
              updateStrokeColor = true;
            }
          }

          if (hasBuilding) {
            buildingsRendered++;
          } else if (hasPip) {
            pipsRendered++;
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
      plotStrokeMesh.current.count = cameraAltitude > OUTLINE_VISIBILITY_ALTITUDE ? 0 : visiblePlotTally;
      // console.log('i', i, buildingsRendered, pipsRendered, pipMesh.current.count);

      // (building mesh isn't created if no buildings)
      if (buildingMesh.current && updateBuildingColor) buildingMesh.current.instanceColor.needsUpdate = true;
      if (buildingMesh.current && updateBuildingMatrix) buildingMesh.current.instanceMatrix.needsUpdate = true;
      if (pipMesh.current && updatePipMatrix) pipMesh.current.instanceMatrix.needsUpdate = true;
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
  }, [account, cameraAltitude, plotData, regionsByDistance]);

  useEffect(
    () => updateVisiblePlots(),
    [chunkyAltitude, positionsReady, regionsByDistance] // eslint-disable-line react-hooks/exhaustive-deps
  );


  const mouseMesh = useRef();
  const highlightPlot = useCallback((plotId) => {
    if (highlighted.current === plotId) return;
    if (highlighted.current !== undefined) {
      mouseMesh.current.material.opacity = 0;
    }
    if (plotId !== undefined) {  // TODO: is there a plot #0?
      if (!positions.current) return;
      mouseMesh.current.position.set(
        positions.current[plotId * 3 + 0],
        positions.current[plotId * 3 + 1],
        positions.current[plotId * 3 + 2]
      );

      const orientation = new Vector3(
        orientations.current[plotId * 3 + 0],
        orientations.current[plotId * 3 + 1],
        orientations.current[plotId * 3 + 2]
      );
      orientation.applyQuaternion(attachTo.quaternion);
      mouseMesh.current.lookAt(orientation);

      mouseMesh.current.material.opacity = 1;

      highlighted.current = plotId;
    }
  }, [attachTo.quaternion]);

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
      setRegionsByDistance([0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraNormalized?.string, regionsByDistance?.length, regionTally]);

  useFrame(() => {
    if (!plotTally) return;
    if (!lastMouseIntersect.current) return;
    if (cameraAltitude > MOUSE_VISIBILITY_ALTITUDE) { highlightPlot(); return; }
    if (!mouseIntersect || mouseIntersect.length() === 0) { highlightPlot(); return; }
    if (mouseIntersect.distanceToSquared(lastMouseIntersect.current) < MOUSE_THROTTLE_DISTANCE) return;

    lastMouseIntersect.current = null;
    processInBackground(
      {
        topic: 'findClosestPlots',
        data: {
          center: mouseIntersect.clone().normalize(),
          findTally: 1,
          plotTally
        }
      },
      (data) => {
        highlightPlot(data.plots[0]);
        lastMouseIntersect.current = mouseIntersect.clone();
      }
    )
  }, 0.5);

  return null;
};

export default Plots;
