import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCubeTexture } from '@react-three/drei';

import useStore from '~/hooks/useStore';

const SettingsManager = (props) => {
  const { scene } = useThree();
  const skyboxVisible = useStore(state => state.graphics.skybox);

  // Import skybox textures
  const skybox = useCubeTexture([
    'sky_pos_x.jpg', 'sky_neg_x.jpg', 'sky_pos_y.jpg', 'sky_neg_y.jpg', 'sky_pos_z.jpg', 'sky_neg_z.jpg'
  ], { path: `${process.env.PUBLIC_URL}/textures/skybox/`});

  useEffect(() => {
    if (skyboxVisible) {
      scene.background = skybox;
    } else {
      scene.background = null;
    }
  }, [ scene, skyboxVisible, skybox ]);

  return null;
};

export default SettingsManager;
