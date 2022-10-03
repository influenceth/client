import { Group, Vector3 } from 'three';

import Config from '~/lib/asteroidConfig';
import constants from '~/lib/constants';
import QuadtreeTerrainCube from './QuadtreeTerrainCube';


const cleanupMaterial = material => {
	material.dispose();

	// dispose textures
	for (const key of Object.keys(material)) {
		const value = material[key];
		if (value && typeof value === 'object' && 'minFilter' in value) {
			value.dispose();
		}
	}
};
export const cleanupScene = (scene) => {
  scene.traverse(object => {
    if (object.isMesh) {
      object.geometry.dispose();

      if (object.material.isMaterial) {
        cleanupMaterial(object.material);
      } else { // an array of materials
        for (const material of object.material) cleanupMaterial(material);
      }
    }
    scene.remove(object);
  });
}

export const renderDummyAsteroid = (asteroid, resolution, webWorkerPool, callback) => {
  if (!asteroid) return;
  const exportable = new Group();
  const manager = new QuadtreeTerrainCube(
    asteroid.asteroidId,
    new Config(asteroid),
    resolution,
    webWorkerPool,
    true
  );
  manager.groups.forEach((g) => exportable.add(g));
  manager.setCameraPosition(new Vector3(0, 0, constants.AU));  // make sure one quad per side

  const waitUntilReady = (whenReady) => {
    if (manager.builder.isPreparingUpdate()) {
      if (!manager.builder.isReadyToFinish()) {
        manager.builder.updateMaps();
      } else {
        manager.builder.update();
        whenReady();
      }
    }
    setTimeout(waitUntilReady, 100, whenReady);
  };
  new Promise(waitUntilReady).then(() => {
    Object.values(manager.chunks).forEach(({ chunk }) => {
      chunk.makeExportable();
    });

    // return the object and a callback for disposing of object
    callback(exportable, manager.dispose);
  });
};