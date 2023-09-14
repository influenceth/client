import { useEffect, useRef } from 'react';
import { AmbientLight, Color, DirectionalLight} from 'three';
import { Canvas, useThree } from '@react-three/fiber';

import { cleanupScene, renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';
import constants from '~/lib/constants';

const RenderedAsteroid = ({ asteroid, brightness = 1, onReady, webWorkerPool }) => {
  const { camera, gl, scene } = useThree();
  const disposeFunc = useRef();

  useEffect(() => {
    if (asteroid?.id && webWorkerPool) {
      renderDummyAsteroid(asteroid, asteroid.i < 25 ? 64 : 32, webWorkerPool, (asteroidModel, dispose) => {
        asteroidModel.traverse(function (node) {
          if (node.isMesh) {
            node.material.map = null;
            node.material.color = new Color(theme.colors.main).multiplyScalar(0.3);
          }
        });

        const radiusMeters = asteroid.Celestial.radius * 1000; // km -> m
        scene.add(asteroidModel);

        const lightColor = new Color(theme.colors.main);
        const lightIntensity = brightness * 0.7;

        const ambientLight = new AmbientLight(lightColor, 0.15 * lightIntensity);
        scene.add(ambientLight);

        const depth = -0.5 * radiusMeters;

        const light = new DirectionalLight(lightColor, lightIntensity);
        light.position.set(-1 * radiusMeters, -1 * radiusMeters, depth);
        scene.add(light);

        const light2 = new DirectionalLight(lightColor, lightIntensity);
        light2.position.set(1 * radiusMeters, -1 * radiusMeters, depth);
        scene.add(light2);

        const light3 = new DirectionalLight(lightColor, lightIntensity);
        light3.position.set(0, 1 * radiusMeters, depth);
        scene.add(light3);

        // Adjust zoom so the smaller asteroids look smaller
        let distance = 1.5 + 1.5 * (1 - Math.pow(radiusMeters / constants.MAX_ASTEROID_RADIUS, 0.3));
        camera.position.set(0, 0, distance * radiusMeters);
        camera.far = 4 * radiusMeters;
        camera.updateProjectionMatrix();

        gl.render(scene, camera);
        if (onReady) onReady();

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
  }, [asteroid?.i, brightness, !!webWorkerPool]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const RenderedAsteroidInCanvas = (props) => {
  const webWorkerPool = useWebWorker();
  return (
    <Canvas
      antialias
      frameloop="never"
      style={{ width: '100%', height: '100%', ...(props.style || {}) }}>
      <RenderedAsteroid {...props} webWorkerPool={webWorkerPool} />
    </Canvas>
  );
};

export default RenderedAsteroidInCanvas;