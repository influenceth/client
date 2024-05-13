import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';

import { sceneVisualDefaults } from '~/game/scene/Asteroid';

const DevToolContext = React.createContext();

export function DevToolProvider({ children }) {
  const [assetType, setAssetType] = useState();
  const [modelUrl, setModelUrl] = useState();

  // overrides (if null/undefined, modelviewer will use default for asset type)
  const [background, setBackground] = useState();
  const [backgroundOverrideName, setBackgroundOverrideName] = useState();
  const [backgroundStrength, setBackgroundStrength] = useState();
  const [bloomRadius, setBloomRadius] = useState();
  const [bloomStrength, setBloomStrength] = useState();
  const [bloomSmoothing, setBloomSmoothing] = useState();
  const [enablePostprocessing, setEnablePostprocessing] = useState();
  const [enableRotation, setEnableRotation] = useState();
  const [enableRevolution, setEnableRevolution] = useState();
  const [enableZoomLimits, setEnableZoomLimits] = useState();
  const [envmap, setEnvmap] = useState();
  const [envmapOverrideName, setEnvmapOverrideName] = useState();
  const [envmapStrength, setEnvmapStrength] = useState();
  const [keylightIntensity, setKeylightIntensity] = useState();
  const [lightmapStrength, setLightmapIntensity] = useState();
  const [rimlightIntensity, setRimlightIntensity] = useState();
  const [spotlightReduction, setSpotlightReduction] = useState();
  const [toneMapping, setToneMapping] = useState(ACESFilmicToneMapping);
  const [toneMappingExposure, setToneMappingExposure] = useState(1);
  const [trackCamera, setTrackCamera] = useState();
  const [darklightColor, setDarklightColor] = useState();
  const [darklightStrength, setDarklightStrength] = useState();
  const [starColor, setStarColor] = useState();
  const [starStrength, setStarStrength] = useState();
  const [ready, setReady] = useState(0);

  // reset most overrides on change of asset type
  useEffect(() => {
    setBackgroundStrength();
    setBloomRadius();
    setBloomSmoothing();
    setBloomStrength();
    setEnablePostprocessing();
    setEnableRotation();
    setEnableRevolution();
    setEnableZoomLimits();
    setEnvmap();
    setEnvmapOverrideName();
    setEnvmapStrength();
    setKeylightIntensity();
    setLightmapIntensity();
    setRimlightIntensity();
    setSpotlightReduction();

    if (assetType === 'scene') {
      setBackgroundStrength(sceneVisualDefaults.backgroundStrength);
      setBloomRadius(sceneVisualDefaults.bloomRadius);
      setBloomSmoothing(sceneVisualDefaults.bloomSmoothing);
      setBloomStrength(sceneVisualDefaults.bloomStrength);
      setEnablePostprocessing(sceneVisualDefaults.enablePostprocessing);

      setStarColor(sceneVisualDefaults.starColor);
      setStarStrength(sceneVisualDefaults.starStrength);
      setDarklightColor(sceneVisualDefaults.darklightColor);
      setDarklightStrength(sceneVisualDefaults.darklightStrength);

      setToneMapping(sceneVisualDefaults.toneMapping);
      setToneMappingExposure(sceneVisualDefaults.toneMappingExposure);
      setReady(1);
    }
  }, [assetType]);

  const contextValue = useMemo(() => ({
    overrides: {
      assetType,
      modelUrl,
      background,
      backgroundOverrideName,
      backgroundStrength,
      bloomRadius,
      bloomSmoothing,
      bloomStrength,
      darklightColor,
      darklightStrength,
      enablePostprocessing,
      enableRotation,
      enableRevolution,
      enableZoomLimits,
      envmap,
      envmapOverrideName,
      envmapStrength,
      keylightIntensity,
      lightmapStrength,
      ready,
      rimlightIntensity,
      spotlightReduction,
      starColor,
      starStrength,
      toneMapping,
      toneMappingExposure,
      trackCamera
    },
    setAssetType,
    setModelUrl,
    setBackground,
    setBackgroundOverrideName,
    setBackgroundStrength,
    setBloomRadius,
    setBloomSmoothing,
    setBloomStrength,
    setDarklightColor,
    setDarklightStrength,
    setEnablePostprocessing,
    setEnableRotation,
    setEnableRevolution,
    setEnableZoomLimits,
    setEnvmap,
    setEnvmapOverrideName,
    setEnvmapStrength,
    setKeylightIntensity,
    setLightmapIntensity,
    setRimlightIntensity,
    setSpotlightReduction,
    setStarColor,
    setStarStrength,
    setToneMapping,
    setToneMappingExposure,
    setTrackCamera
  }), [
    assetType,
    modelUrl,
    background,
    backgroundOverrideName,
    backgroundStrength,
    bloomRadius,
    bloomSmoothing,
    bloomStrength,
    darklightColor,
    darklightStrength,
    enablePostprocessing,
    enableRotation,
    enableRevolution,
    enableZoomLimits,
    envmap,
    envmapOverrideName,
    envmapStrength,
    keylightIntensity,
    lightmapStrength,
    ready,
    rimlightIntensity,
    spotlightReduction,
    starColor,
    starStrength,
    toneMapping,
    toneMappingExposure,
    trackCamera
  ]);

  return (
    <DevToolContext.Provider value={contextValue}>
      {children}
    </DevToolContext.Provider>
  );
}

export default DevToolContext;