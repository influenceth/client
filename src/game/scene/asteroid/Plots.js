import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  CylinderGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D
} from 'three';

import useWebWorker from '~/hooks/useWebWorker';

const Plots = ({ attachTo, config, surface }) => {
  const { scene } = useThree();
  const { gpuProcessInBackground } = useWebWorker();

  const plotPoints = useRef();

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
            aboveSurface: 0,//-50
          }
        },
        (data) => {
          const geometry = new CylinderGeometry( 50, 100, 250, 6, 1, false );
          geometry.rotateX(-Math.PI / 2);
          const material = new MeshStandardMaterial({ color: 0xffffff }); // TODO: which material type makes sense?

          const plotTally = data.positions.length / 3;
          plotPoints.current = new InstancedMesh(geometry, material, plotTally);
					(attachTo || scene).add(plotPoints.current);

			    const dummy = new Object3D();
          for (let i = 0; i < plotTally; i++) {
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

            plotPoints.current.setMatrixAt(i, dummy.matrix);
          }
          plotPoints.current.instanceMatrix.needsUpdate = true;
          plotPoints.current.userData.bloom = true;

          // console.log('data', data.debugs);
          // if (data.debugs) {
          //   const pointsGeometry = new BufferGeometry();
          //   pointsGeometry.setAttribute('position', new BufferAttribute(data.debugs, 3));
          //   plotPoints.current = new Points(
          //     pointsGeometry,
          //     new PointsMaterial({
          //       color: 'white',
          //       size: 20,
          //       sizeAttenuation: true
          //     })
          //   );
          //   plotPoints.current.userData.bloom = true;
          // }
          // scene.add(plotPoints.current);
        }
      )

      return () => {
        if (plotPoints.current) {
          (attachTo || scene).remove(plotPoints.current);
        }
      }
    }
  }, [config?.radius, surface]);

  return null;
};

export default Plots;
