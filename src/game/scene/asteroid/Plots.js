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

const MAX_MESH_INSTANCES = 5000;
const PIP_VISIBILITY_ALTITUDE = 25000;
const OUTLINE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE * 0.5;
const MOUSE_VISIBILITY_ALTITUDE = PIP_VISIBILITY_ALTITUDE;

const MOUSE_THROTTLE_DISTANCE = 50 ** 2;

const Plots = ({ attachTo, asteroidId, cameraAltitude, cameraNormalized, config, mouseIntersect, surface }) => {
  const { account } = useAuth();
  const { scene } = useThree();
  const { gpuProcessInBackground, processInBackground } = useWebWorker();

  const [positionsReady, setPositionsReady] = useState(false);
  const [regionsByDistance, setRegionsByDistance] = useState([]);

  const positions = useRef();
  const orientations = useRef();
  const regions = useRef();
  const plotsByRegion = useRef([]);

  const pipMesh = useRef();
  const buildingMesh = useRef();

  const plotStrokeMesh = useRef();
  const plotFillMesh = useRef();
  const lastMouseIntersect = useRef(new Vector3());
  const highlighted = useRef();

  // const PLOT_WIDTH = useMemo(() => 125, [config?.radius]);
  const PLOT_WIDTH = useMemo(() => Math.min(150, config?.radius / 25), [config?.radius]);
  const PLOT_STROKE_MARGIN = useMemo(() => 0.125 * PLOT_WIDTH, [PLOT_WIDTH]);
  const BUILDING_RADIUS = useMemo(() => 0.375 * PLOT_WIDTH, [PLOT_WIDTH]);
  const PIP_RADIUS = useMemo(() => 0.25 * PLOT_WIDTH, [PLOT_WIDTH]);

  const regionTally = 5000;  // TODO: make dynamic

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * (config?.radiusNominal / 1000) ** 2), [config?.radiusNominal]);
  const visiblePlotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, plotTally), [plotTally]);

  // TODO: when this is real, only needs origin, and can move back to top
  const { data: plotData } = useAsteroidPlots(asteroidId, plotTally);
  // ^^^

  const buildingTally = useMemo(() => plotData?.plots && Object.values(plotData?.plots).reduce((acc, cur) => acc + (cur && cur[1] > 0 ? 1 : 0), 0), [plotData?.plots]);
  const visibleBuildingTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, buildingTally), [buildingTally]);

  // TODO: handle single-region asteroids

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

  }, [visiblePlotTally]);

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

  }, [visibleBuildingTally]);

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

    // TODO: since this is on buildings and pips, should potentially limit to total
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

  }, [visiblePlotTally]);

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
  }, []);

  useEffect(() => {
    if (!surface?.sides) return;
    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    // TODO: need to support DISABLE_BACKGROUND_TERRAIN_MAPS here (i.e. if OffscreenCanvas is not allowed, must generate textures on main thread)
    gpuProcessInBackground(
      {
        topic: 'buildPlotGeometry',
        data: {
          config: prunedConfig,
          regionTally,
          aboveSurface: 0
        }
      },
      (data) => {
        positions.current = data.positions;
        orientations.current = data.orientations;
        regions.current = data.regions;
        
        plotsByRegion.current = [];
        for (let i = 0; i < plotTally; i++) {
          const region = regions.current[i];
          if (!plotsByRegion.current[region]) plotsByRegion.current[region] = [];
          plotsByRegion.current[region].push(i);
        }

        setPositionsReady(true);
      }
    );
  }, [!surface?.sides]); // eslint-disable-line react-hooks/exhaustive-deps

  const chunkyAltitude = useMemo(() => Math.round(cameraAltitude / 500) * 500, [cameraAltitude]);

  const updateVisiblePlots = useCallback(() => {
    if (!positions.current) return;
    if (!regionsByDistance?.length) return;
    if (!plotsByRegion.current?.length) return;
    try {
      const dummy = new Object3D();

      // buildings
      // TODO: if total buildings < total allowable buildings, only have to do this loop once (and not every render)
      //  (although setScaleAt may need to be run in setAltitude loop)

      // TODO (enhancement): investigate if any benefit to only updating the matrix of instances that actually changed
      //  (i.e. don't necessarily need to update plots that were in visible regions in last cycle and are still visible)
      let buildingsRendered = 0;
      let pipsRendered = 0;
      let breakLoop = false;

      const scale = Math.max(1, Math.min(250 / BUILDING_RADIUS, cameraAltitude / 15000));

      regionsByDistance.every((plotRegion) => {
        (plotsByRegion.current[plotRegion] || []).every((plotId) => {
          const hasBuilding = plotData.plots[plotId] && plotData.plots[plotId][1];
          const hasPip = pipsRendered < visiblePlotTally;
          if (hasBuilding || hasPip) {
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
              dummy.scale.set(scale, scale, scale);
            } else {
              dummy.scale.set(1, 1, 1);
            }
            dummy.updateMatrix();

            let useColor = PIP_COLOR;

            // TODO: because dummy is shared, buildings should scale down to 1
            //       at the same time that other iconography becomes visible (or sooner)
            //       so the different objects sharing the dummy don't get funky
            if (hasBuilding) {
              // white if rented by me OR i am the owner and !rented by other; else, blue
              useColor = (
                (plotData.owner === `${account}` && plotData.plots[plotId][0] !== 2)  // owned by me and not rented out
                || plotData.plots[plotId][0] === 1                               // OR rented by me
              ) ? WHITE_COLOR : MAIN_COLOR;
              buildingMesh.current.setColorAt(buildingsRendered, useColor);
              buildingMesh.current.setMatrixAt(buildingsRendered, dummy.matrix);
              buildingsRendered++;

            } else if (hasPip) {
              pipMesh.current.setMatrixAt(pipsRendered, dummy.matrix);
              pipsRendered++;
            }

            // TODO: just use an i instead of the addition?
            plotStrokeMesh.current.setColorAt(pipsRendered + buildingsRendered, useColor);
            plotStrokeMesh.current.setMatrixAt(pipsRendered + buildingsRendered, dummy.matrix);

            breakLoop = (buildingsRendered >= visibleBuildingTally && pipsRendered >= visiblePlotTally);
          }
          if (breakLoop) return false;
          return true;
        });
        if (breakLoop) return false;
        return true;
      });
      pipMesh.current.count = cameraAltitude > PIP_VISIBILITY_ALTITUDE ? 0 : visiblePlotTally;
      plotStrokeMesh.current.count = cameraAltitude > OUTLINE_VISIBILITY_ALTITUDE ? 0 : visiblePlotTally;

      // TODO: the below should be conditional

      // (building mesh isn't created if no buildings)
      if (buildingMesh.current) {
        buildingMesh.current.instanceColor.needsUpdate = true;
        buildingMesh.current.instanceMatrix.needsUpdate = true;
        buildingMesh.current.material.needsUpdate = true; // TODO: unclear if just needs this first time color is set?
      }
      pipMesh.current.instanceMatrix.needsUpdate = true;

      plotStrokeMesh.current.instanceColor.needsUpdate = true;
      plotStrokeMesh.current.instanceMatrix.needsUpdate = true;
      plotStrokeMesh.current.material.needsUpdate = true; // TODO: unclear if just needs this first time color is set?

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
  }, [cameraAltitude, regionsByDistance]);

  useEffect(updateVisiblePlots, [chunkyAltitude, positionsReady, regionsByDistance]);


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
      // mouseMesh.current.updateMatrix(); // TODO: is this needed?

      highlighted.current = plotId;
    }
  }, []);

  // TODO: benchmark everything
  //  throttle what helps and move stuff to webworker where possible
  //  (i.e. could set asteroid region buckets in cache for workers)

  // TODO: throttle this?
  useEffect(() => {
    if (cameraNormalized?.string) {
      processInBackground(
        {
          topic: 'findClosestPlots',
          data: {
            center: cameraNormalized.vector,
            // findTally: showRegions,
            plotTally: regionTally,
          }
        },
        (data) => {
          setRegionsByDistance(data.plots);
        }
      );
    }
  }, [cameraNormalized?.string]);

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
