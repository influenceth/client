import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Vector3
} from 'three';

import useWebWorker from '~/hooks/useWebWorker';

const DEFAULT_COLOR = new Color().setHex(0xffffff);
const HIGHLIGHT_COLOR = new Color().setHex(0xff0000);
const ABOVE_SURFACE = 0;

const Plots = ({ attachTo, config, mouseIntersect, surface }) => {
  const { scene } = useThree();
  const { gpuProcessInBackground, processInBackground } = useWebWorker();

  const plotMesh = useRef();
  const plotTally = useRef();
  const lastMouseIntersect = useRef(new Vector3());

  useEffect(() => {
    if (config?.radiusNominal && surface?.sides) {
      const {
        ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
        ...prunedConfig
      } = config;
      gpuProcessInBackground(
        {
          topic: 'buildPlotGeometry',
          data: {
            config: prunedConfig,
            aboveSurface: ABOVE_SURFACE
          }
        },
        (data) => {
          const geometry = new CylinderGeometry( 50, 100, 250, 16, 1, false );
          geometry.rotateX(-Math.PI / 2);
          const material = new MeshBasicMaterial({
            // color: DEFAULT_COLOR,
            opacity: 0.1,
            side: DoubleSide,
            transparent: true
          }); // TODO: which material type makes sense?

          plotTally.current = data.positions.length / 3;
          plotMesh.current = new InstancedMesh(geometry, material, plotTally.current);
					(attachTo || scene).add(plotMesh.current);

			    const dummy = new Object3D();
          for (let i = 0; i < plotTally.current; i++) {
            dummy.position.set(
              data.positions[i * 3 + 0],
              data.positions[i * 3 + 1],
              data.positions[i * 3 + 2]
            );

            dummy.lookAt(
              data.orientations[i * 3 + 0],
              data.orientations[i * 3 + 1],
              data.orientations[i * 3 + 2]
            );

            dummy.updateMatrix();

            plotMesh.current.setColorAt(i, DEFAULT_COLOR);
            plotMesh.current.setMatrixAt(i, dummy.matrix);
          }
          plotMesh.current.instanceColor.needsUpdate = true;
          plotMesh.current.instanceMatrix.needsUpdate = true;
          plotMesh.current.userData.bloom = true;

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
        }
      )

      return () => {
        if (plotMesh.current) {
          (attachTo || scene).remove(plotMesh.current);
        }
      }
    }
  }, [config?.radius, surface]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlighted = useRef();
  const highlightPlot = (i) => {
    if (highlighted.current === i) return;
    if (highlighted.current !== undefined) {
      plotMesh.current.setColorAt( highlighted.current, DEFAULT_COLOR );
    }
    if (i !== undefined) {  // TODO: is there a plot #0?
      plotMesh.current.setColorAt( i, HIGHLIGHT_COLOR );
      highlighted.current = i;
    }
    plotMesh.current.instanceColor.needsUpdate = true;
  };

  useFrame(() => {
    if (!plotTally.current) return;
    if (!lastMouseIntersect.current) return;
    if (!mouseIntersect || mouseIntersect.length() === 0) { highlightPlot(); return; }
    // TODO (enhancement): throttle this by distance
    if (mouseIntersect.equals(lastMouseIntersect.current)) return;

    lastMouseIntersect.current = null;
    const {
      ringsMinMax, ringsPresent, ringsVariation, rotationSpeed,
      ...prunedConfig
    } = config;
    processInBackground(
      {
        topic: 'findClosestPlots',
        data: {
          center: mouseIntersect,
          findTally: 1,
          plotTally: plotTally.current,
          
          config: prunedConfig,
          aboveSurface: ABOVE_SURFACE
        }
      },
      (data) => {
        highlightPlot(data.plots[0]);
        lastMouseIntersect.current = mouseIntersect.clone();
      }
    )
  });

  return null;
};

export default Plots;
