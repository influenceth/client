import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
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
const WHITE_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();
const RED_COLOR = new Color().setHex(0xff0000).convertSRGBToLinear();
const HIGHLIGHT_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const MAX_MESH_INSTANCES = 5000;

const BUILDING_RADIUS = 75; // (at surface)
const PIP_RADIUS = 50; // (at surface)

const Plots = ({ attachTo, cameraAltitude, cameraNormalized, config, mouseIntersect, surface }) => {
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

  // TODO: this should relate to absolute displacement range for the asteroid (rather than radius)
  //        (potentially just fine displacement even)
  const ABOVE_SURFACE = useMemo(() => {
    return (0.15 * config?.fineDispFraction * config?.dispWeight * config?.radius) || 0;
  }, [config?.fineDispFraction, config?.dispWeight, config?.radius]);
  const PLOT_WIDTH = useMemo(() => 125, [config?.radius]);
  const PLOT_STROKE_MARGIN = useMemo(() => PLOT_WIDTH / 5, [PLOT_WIDTH]);

  const regionTally = 5000;  // TODO: make dynamic
  const plotTally = useMemo(() => Math.floor(4 * Math.PI * (config?.radiusNominal / 1000) ** 2), [config?.radiusNominal]);

  // TODO: when this is real, only needs origin, and can move back to top
  const { data: plotData } = useAsteroidPlots(origin, plotTally);

  const visiblePlotTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, plotTally), [plotTally]);

  const buildingTally = useMemo(() => plotData?.plots && Object.values(plotData?.plots).reduce((acc, cur) => acc + (cur && cur[1] > 0 ? 1 : 0), 0), [plotData?.plots]);
  const visibleBuildingTally = useMemo(() => Math.min(MAX_MESH_INSTANCES, buildingTally), [buildingTally]);

  // TODO: handle single-region asteroids

  // instantiate pips mesh
  useEffect(() => {
    if (!visiblePlotTally) return;

    const pipGeometry = new CircleGeometry(PIP_RADIUS, 6);
    const pipMaterial = new MeshBasicMaterial({
      color: new Color('#777777'),
      side: DoubleSide,
      toneMapped: false,
      transparent: false
    });

    pipMesh.current = new InstancedMesh(pipGeometry, pipMaterial, visiblePlotTally);
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
      side: DoubleSide,
      toneMapped: false,
      transparent: false
    });

    buildingMesh.current = new InstancedMesh(buildingGeometry, buildingMaterial, visibleBuildingTally);
    buildingMesh.current.userData.bloom = true;
    (attachTo || scene).add(buildingMesh.current);

    return () => {
      if (buildingMesh.current) {
        (attachTo || scene).remove(buildingMesh.current);
      }
    };

  }, [visibleBuildingTally]);


  useEffect(() => {
    if (!visiblePlotTally) return;

  //   // const strokeGeometry = new TorusGeometry(PLOT_WIDTH, 5, 3, 6);
    //   const strokeGeometry = new RingGeometry(PLOT_WIDTH, PLOT_WIDTH + PLOT_STROKE_MARGIN, 6, 1);
    //   const strokeMaterial = new MeshBasicMaterial({
    //     color: new Color('#ffffff'),
    //     side: DoubleSide,
    //     toneMapped: false,
    //     transparent: false
    //   });

    //   const fillGeometry = new CircleGeometry(PLOT_WIDTH - PLOT_STROKE_MARGIN, 6);
    //   const fillMaterial = new MeshBasicMaterial({
    //     color: new Color('#ffffff'),
    //     opacity: 0.25,
    //     side: DoubleSide,
    //     toneMapped: false,
    //     transparent: true
    //   });

  }, [visiblePlotTally]);

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
          aboveSurface: ABOVE_SURFACE
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

    const dummy = new Object3D();

    // buildings
    // TODO: if total buildings < total allowable buildings, only have to do this loop once (and not every render)
    //  (although setScaleAt may need to be run in setAltitude loop)

    // TODO (enhancement): investigate if any benefit to only updating the matrix of instances that actually changed
    //  (i.e. don't necessarily need to update plots that were in visible regions in last cycle and are still visible)
    let buildingsRendered = 0;
    let pipsRendered = 0;
    let breakLoop = false;

    const scale = Math.max(1, Math.min(300 / BUILDING_RADIUS, cameraAltitude / 15000));

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

          // TODO: because dummy is shared, buildings should scale down to 1
          //       at the same time that other iconography becomes visible (or sooner)
          //       so the different objects sharing the dummy don't get funky
          if (hasBuilding) {
            // white if rented by me OR i am the owner and !rented by other; else, blue
            const useColor = (
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

          breakLoop = (buildingsRendered >= visibleBuildingTally && pipsRendered >= visiblePlotTally);
        }
        if (breakLoop) return false;
        return true;
      });
      if (breakLoop) return false;
      return true;
    });
    pipMesh.current.count = cameraAltitude > 25000 ? 0 : visiblePlotTally;

    // TODO: these should be conditional
    buildingMesh.current.instanceColor.needsUpdate = true;
    buildingMesh.current.instanceMatrix.needsUpdate = true;
    buildingMesh.current.material.needsUpdate = true;

    pipMesh.current.instanceMatrix.needsUpdate = true;

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
  }, [cameraAltitude, regionsByDistance]);

  useEffect(updateVisiblePlots, [chunkyAltitude, positionsReady, regionsByDistance]);

  const highlightPlot = (i) => {
    // if (highlighted.current === i) return;
    // if (highlighted.current !== undefined) {
    //   plotStrokeMesh.current.setColorAt( highlighted.current, MAIN_COLOR );
    // }
    // if (i !== undefined) {  // TODO: is there a plot #0?
    //   plotStrokeMesh.current.setColorAt( i, HIGHLIGHT_COLOR );
    //   highlighted.current = i;
    // }
    // plotStrokeMesh.current.instanceColor.needsUpdate = true;
  };

  // TODO: benchmark everything
  //  throttle what helps and move stuff to webworker where possible
  //  (i.e. could set asteroid region buckets in cache for workers)

  // TODO: throttle this?
  useEffect(() => {
    if (cameraNormalized?.string) {
      console.log('cameraNormalized?.string', cameraNormalized?.string);
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

  // TODO: restore mouse interactions

  // useFrame(() => {
  //   if (!plotTally.current) return;
  //   if (!lastMouseIntersect.current) return;
  //   if (!mouseIntersect || mouseIntersect.length() === 0) { highlightPlot(); return; }
  //   // TODO (enhancement): throttle this by distance
  //   if (mouseIntersect.equals(lastMouseIntersect.current)) return;

  //   // TODO: potential performance improvements
  //   //  - can we do this with raycasting more simply?
  //   //  - could we handle this in vertex shader?

  //   lastMouseIntersect.current = null;
  //   const {
  //     ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
  //     ...prunedConfig
  //   } = config;
  //   processInBackground(
  //     {
  //       topic: 'findClosestPlots',
  //       data: {
  //         center: mouseIntersect,
  //         findTally: 1,
  //         plotTally: plotTally.current,
  //         //config: prunedConfig,
  //         //aboveSurface: ABOVE_SURFACE
  //       }
  //     },
  //     (data) => {
  //       highlightPlot(data.plots[0]);
  //       lastMouseIntersect.current = mouseIntersect.clone();
  //     }
  //   )
  // });

  return null;
};

export default Plots;
