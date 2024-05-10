import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';

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

  // reset most overrides on change of asset type
  useEffect(() => {
    setBackgroundStrength();
    setBloomRadius();
    setBloomStrength();
    setEnablePostprocessing();
    setEnableRotation();
    setEnableRevolution();
    setEnableZoomLimits();
    setEnvmap();
    setEnvmapOverrideName();
    setEnvmapStrength();
  }, [assetType])

  const contextValue = useMemo(() => ({
    overrides: {
      assetType,
      modelUrl,
      background,
      backgroundOverrideName,
      backgroundStrength,
      bloomRadius,
      bloomStrength,
      enablePostprocessing,
      enableRotation,
      enableRevolution,
      enableZoomLimits,
      envmap,
      envmapOverrideName,
      envmapStrength,
      keylightIntensity,
      lightmapStrength,
      rimlightIntensity,
      spotlightReduction,
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
    setBloomStrength,
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
    bloomStrength,
    enablePostprocessing,
    enableRotation,
    enableRevolution,
    enableZoomLimits,
    envmap,
    envmapOverrideName,
    envmapStrength,
    keylightIntensity,
    lightmapStrength,
    rimlightIntensity,
    spotlightReduction,
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