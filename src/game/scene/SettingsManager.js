import { useContext, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useCubeTexture } from '@react-three/drei';
import { Color } from 'three';

import useStore from '~/hooks/useStore';
import DevToolContext from '~/contexts/DevToolContext';
import { sceneVisualDefaults } from './Asteroid';

const SettingsManager = () => {
  const { gl, scene, camera, renderer } = useThree();
  const fov = useStore(s => s.graphics.fov);
  const pixelRatio = useStore(s => s.graphics.pixelRatio);
  const skyboxVisible = useStore(s => s.graphics.skybox);

  const { assetType, overrides } = useContext(DevToolContext);

  const [BACKGROUND_INTENSITY] = useMemo(() => {
    const o = assetType === 'scene' ? overrides : {};
    return [
      isNaN(o?.backgroundStrength) ? sceneVisualDefaults.backgroundStrength : o.backgroundStrength
    ];
  }, [assetType, overrides]);

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
      scene.background = new Color(0x0000ff);
    }
  }, [ scene, skyboxVisible, skybox ]);

  useEffect(() => {
    scene.backgroundIntensity = BACKGROUND_INTENSITY;
  }, [BACKGROUND_INTENSITY]);

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
