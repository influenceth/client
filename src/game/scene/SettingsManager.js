import { useContext, useEffect, useMemo, useState } from '~/lib/react-debug';
import { useThree } from '@react-three/fiber';
import { useCubeTexture } from '@react-three/drei';
import { Color, EquirectangularReflectionMapping, TextureLoader } from 'three';

import useStore from '~/hooks/useStore';
import DevToolContext from '~/contexts/DevToolContext';
import visualConfigs from '~/lib/visuals';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const SettingsManager = () => {
  const { gl, scene, camera } = useThree();
  const fov = useStore(s => s.graphics.fov);
  const pixelRatio = useStore(s => s.graphics.pixelRatio);
  const skyboxVisible = useStore(s => s.graphics.skybox);

  const { assetType, overrides } = useContext(DevToolContext);

  const [overrideTexture, setOverrideTexture] = useState();

  const [backgroundOverride, backgroundOverrideName, backgroundIntensity] = useMemo(import.meta.url, () => {
    const defaults = visualConfigs.scene;
    const o = assetType === 'scene' ? overrides : {};
    return [
      o.background,
      o.backgroundOverrideName,
      isNaN(o?.backgroundStrength) ? defaults.backgroundStrength : o.backgroundStrength
    ];
  }, [assetType, overrides]);

  // Import skybox textures
  const skybox = useCubeTexture([
    'sky_pos_x.jpg', 'sky_neg_x.jpg', 'sky_pos_y.jpg', 'sky_neg_y.jpg', 'sky_pos_z.jpg', 'sky_neg_z.jpg'
  ], { path: `${process.env.PUBLIC_URL}/textures/skybox/`});

  useEffect(import.meta.url, () => {
    if (backgroundOverride && backgroundOverrideName) {
      const cleanupTextures = [];
      const resolve = function (texture) {
        cleanupTextures.push(texture);
        texture.mapping = EquirectangularReflectionMapping;
        
        setOverrideTexture(texture);
      }

      if (/\.hdr$/i.test(backgroundOverrideName || backgroundOverride || '')) {
        new RGBELoader().load(backgroundOverride, resolve);
      } else {
        new TextureLoader().load(backgroundOverride, resolve);
      }

      return () => {
        cleanupTextures.forEach((t) => t.dispose());
        setOverrideTexture();
      };
    }
  }, [backgroundOverride, backgroundOverrideName]);

  useEffect(import.meta.url, () => {
    gl.setPixelRatio(pixelRatio || 1);
  }, [pixelRatio]);

  // toggle background on / off per settings
  useEffect(import.meta.url, () => {
    if (skyboxVisible && skybox) {
      scene.background = overrideTexture || skybox;
    } else if (!skyboxVisible) {
      scene.background = new Color(0x0000ff);
    }
  }, [ overrideTexture, skyboxVisible, skybox ]);

  useEffect(import.meta.url, () => {
    scene.backgroundIntensity = backgroundIntensity;
  }, [backgroundIntensity]);

  // toggle fov as needed
  useEffect(import.meta.url, () => {
    if (fov && camera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [ fov, camera ]);

  return null;
};

export default SettingsManager;
