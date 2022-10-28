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

import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';

const DEFAULT_COLOR = new Color(theme.colors.main).convertSRGBToLinear();
const RED_COLOR = new Color().setHex(0xff0000).convertSRGBToLinear();
const HIGHLIGHT_COLOR = new Color().setHex(0xffffff).convertSRGBToLinear();

const Plots = ({ attachTo, cameraNormalized, config, mouseIntersect, surface }) => {
  const { scene } = useThree();
  const { gpuProcessInBackground, processInBackground } = useWebWorker();

  const [positionsReady, setPositionsReady] = useState(false);
  const [visibleRegions, setVisibleRegions] = useState([]);

  const positions = useRef();
  const orientations = useRef();
  const regions = useRef();
  const plotsByRegion = useRef([]);

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
  const visiblePlotTally = useMemo(() => Math.min(10000, plotTally), [plotTally]);

  const showRegions = useMemo(() => Math.ceil(visiblePlotTally / (plotTally / regionTally)), [visiblePlotTally, plotTally, regionTally]);

  // TODO: handle single-region asteroids

  // TODO (add): cull by absolute distance as well

  useEffect(() => {
    if (!visiblePlotTally) return;

    // TODO: if blooming buildings, could probably get same effect with circle geometry
    // const buildingGeometry = new CylinderGeometry(PLOT_WIDTH / 5.5, PLOT_WIDTH / 5.5, PLOT_WIDTH / 5.5, 6, 1);
    const buildingGeometry = new CircleGeometry(PLOT_WIDTH / 5.5, 6);
    // buildingGeometry.rotateX(-Math.PI / 2);
    const buildingMaterial = new MeshBasicMaterial({
      color: DEFAULT_COLOR,//new Color('#ffffff'),
      side: DoubleSide,
      toneMapped: false,
      transparent: false
    });

    // const strokeGeometry = new TorusGeometry(PLOT_WIDTH, 5, 3, 6);
    const strokeGeometry = new RingGeometry(PLOT_WIDTH, PLOT_WIDTH + PLOT_STROKE_MARGIN, 6, 1);
    const strokeMaterial = new MeshBasicMaterial({
      color: new Color('#ffffff'),
      side: DoubleSide,
      toneMapped: false,
      transparent: false
    });

    const fillGeometry = new CircleGeometry(PLOT_WIDTH - PLOT_STROKE_MARGIN, 6);
    const fillMaterial = new MeshBasicMaterial({
      color: new Color('#ffffff'),
      opacity: 0.25,
      side: DoubleSide,
      toneMapped: false,
      transparent: true
    });

    buildingMesh.current = new InstancedMesh(buildingGeometry, buildingMaterial, visiblePlotTally);
    (attachTo || scene).add(buildingMesh.current);

    plotStrokeMesh.current = new InstancedMesh(strokeGeometry, strokeMaterial, visiblePlotTally);
    (attachTo || scene).add(plotStrokeMesh.current);

    plotFillMesh.current = new InstancedMesh(fillGeometry, fillMaterial, visiblePlotTally);
    // (attachTo || scene).add(plotFillMesh.current);

    return () => {
      if (buildingMesh.current) {
        (attachTo || scene).remove(buildingMesh.current);
      }
      if (plotStrokeMesh.current) {
        (attachTo || scene).remove(plotStrokeMesh.current);
      }
      if (plotFillMesh.current) {
        (attachTo || scene).remove(plotFillMesh.current);
      }
    }
  }, [visiblePlotTally]);


  useEffect(() => {
    console.log('buildPlotGeometry i');
    if (!surface?.sides) return;
    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    console.log('buildPlotGeometry in', {
      config: prunedConfig,
      regionTally,
      aboveSurface: ABOVE_SURFACE
    });
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
        console.log('buildPlotGeometry out');
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


  // TODO: only need to update closestLots on angle change
  // TODO: can update scale / visibility on distance change (or can pass surface altitude from <Asteroid />)


  const updateVisiblePlots = useCallback(() => {
    // console.log('updateVisiblePlots in', positions.current, visibleRegions?.length);
    if (!positions.current) return;
    if (!visibleRegions?.length) return;
    if (!plotsByRegion.current?.length) return;

    // TODO (enhancement): investigate if any benefit to only updating the matrix of instances that actually changed
    //  (i.e. don't necessarily need to update plots that were in visible regions in last cycle and are still visible)
    
    const dummy = new Object3D();
    let i = 0;
    visibleRegions.forEach((plotRegion) => {
      (plotsByRegion.current[plotRegion] || []).forEach((plotId) => {
        if (i > visiblePlotTally) return;

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
  
        dummy.updateMatrix();
  
        // buildingMesh.current.setColorAt(i, DEFAULT_COLOR);
        buildingMesh.current.setMatrixAt(i, dummy.matrix);
  
        plotStrokeMesh.current.setColorAt(i, RED_COLOR);
        plotStrokeMesh.current.setMatrixAt(i, dummy.matrix);
  
        // TODO: fill mesh should be elevated to top of stroke mesh (i.e. + tube radius)
        // plotFillMesh.current.setColorAt(i, DEFAULT_COLOR);
        plotFillMesh.current.setMatrixAt(i, dummy.matrix);

        i++;
      });
    });

    // hide any instances that weren't used
    buildingMesh.current.count = Math.min(i, visiblePlotTally);
    plotStrokeMesh.current.count = Math.min(i, visiblePlotTally);
    plotFillMesh.current.count = Math.min(i, visiblePlotTally);
    
    // buildingMesh.current.instanceColor.needsUpdate = true;
    buildingMesh.current.instanceMatrix.needsUpdate = true;
    buildingMesh.current.userData.bloom = true;

    plotStrokeMesh.current.instanceColor.needsUpdate = true;
    plotStrokeMesh.current.instanceMatrix.needsUpdate = true;
    // plotStrokeMesh.current.userData.bloom = true;

    // plotFillMesh.current.instanceColor.needsUpdate = true;
    plotFillMesh.current.instanceMatrix.needsUpdate = true;
    // plotFillMesh.current.userData.bloom = true;

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
  }, [visibleRegions]);

  useEffect(updateVisiblePlots, [positionsReady, visibleRegions]);

  const highlightPlot = (i) => {
    // if (highlighted.current === i) return;
    // if (highlighted.current !== undefined) {
    //   plotStrokeMesh.current.setColorAt( highlighted.current, DEFAULT_COLOR );
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
            findTally: showRegions,
            plotTally: regionTally,
          }
        },
        (data) => {
          setVisibleRegions(data.plots);
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
