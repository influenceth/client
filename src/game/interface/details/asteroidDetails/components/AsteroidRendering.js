import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight
} from 'three';
import { useThree } from '@react-three/fiber';

import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import theme from '~/theme';

const RenderedAsteroid = ({ asteroid, onReady, webWorkerPool }) => {
  const { camera, gl, scene } = useThree();

  const disposeFunc = useRef();

  useEffect(() => {
    if (asteroid && webWorkerPool) {
      renderDummyAsteroid(asteroid, asteroid.i < 25 ? 64 : 32, webWorkerPool, (asteroidModel, dispose) => {
        asteroidModel.traverse(function (node) {
          if (node.isMesh) {
            node.material.map = null;
            node.material.color.setHex(0xffffff);
          }
        });
        scene.add(asteroidModel);

        const lightColor = new Color(theme.colors.main);
        const lightIntensity = 0.35;

        const ambientLight = new AmbientLight(lightColor, 0.05 * lightIntensity);
        scene.add(ambientLight);

        const light = new DirectionalLight(lightColor, lightIntensity);
        light.position.set(-1 * asteroid.radius, -1 * asteroid.radius, -1 * asteroid.radius);
        scene.add(light);

        const light2 = new DirectionalLight(lightColor, lightIntensity);
        light2.position.set(1 * asteroid.radius, -1 * asteroid.radius, -1 * asteroid.radius);
        scene.add(light2);

        const light3 = new DirectionalLight(lightColor, lightIntensity);
        light3.position.set(0, 1 * asteroid.radius, -1 * asteroid.radius);
        scene.add(light3);

        // TODO (enhancement): might be cool to adjust zoom so the smaller asteroids look
        //  smaller (and huge ones are the ones that tend to overlap spectrum lines)
        // let distance = 2.0 + 2 * (1 - Math.pow(asteroid.radius / 376000, 0.3));
        camera.position.set(0, 0, 2.4 * asteroid.radius);
        camera.far = 4 * asteroid.radius;
        camera.updateProjectionMatrix();

        gl.render(scene, camera);
        onReady();

        disposeFunc.current = dispose;
      });
      return () => {
        try {
          cleanupScene(scene);
          if (disposeFunc.current) {
            disposeFunc.current();
            disposeFunc.current = null;
          }
        } catch(e) {
          console.warn(e);
        }
      }
    }
  }, [!!asteroid, !!webWorkerPool]);  // eslint-disable-line react-hooks/exhaustive-deps
  
  return null;
};

export default RenderedAsteroid;