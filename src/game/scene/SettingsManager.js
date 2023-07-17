import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCubeTexture } from '@react-three/drei';
import { Color } from 'three';

import useStore from '~/hooks/useStore';

const SettingsManager = () => {
  const { gl, scene, camera } = useThree();
  const fov = useStore(s => s.graphics.fov);
  const pixelRatio = useStore(s => s.graphics.pixelRatio);
  const skyboxVisible = useStore(s => s.graphics.skybox);

  useEffect(() => {
    gl.setPixelRatio(pixelRatio || 1);
  }, [pixelRatio]);

  // Import skybox textures
  const skybox = useCubeTexture([
    'sky_pos_x.jpg', 'sky_neg_x.jpg', 'sky_pos_y.jpg', 'sky_neg_y.jpg', 'sky_pos_z.jpg', 'sky_neg_z.jpg'
  ], { path: `${process.env.PUBLIC_URL}/textures/skybox/`});

  // toggle background on / off per settings
  useEffect(() => {
    if (skyboxVisible && (!scene.background || scene.background.isColor) && skybox) {
      scene.background = skybox;
    } else if (!skyboxVisible && scene.background) {
      scene.background = new Color(0x000000);
    }
  }, [ scene, skyboxVisible, skybox ]);

  // toggle fov as needed
  useEffect(() => {
    if (fov && camera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [ fov, camera ]);

  return null;
};

export default SettingsManager;
