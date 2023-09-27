import React, { useCallback, useEffect, useMemo, useState } from 'react';

const DevToolContext = React.createContext();

export function DevToolProvider({ children }) {
  const [assetType, setAssetType] = useState();
  const [modelUrl, setModelUrl] = useState();

  // overrides (if null/undefined, modelviewer will use default for asset type)
  const [background, setBackground] = useState();
  const [backgroundOverrideName, setBackgroundOverrideName] = useState();
  const [bloomRadius, setBloomRadius] = useState();
  const [bloomStrength, setBloomStrength] = useState();
  const [enableDefaultLights, setEnableDefaultLights] = useState();
  const [enablePostprocessing, setEnablePostprocessing] = useState();
  const [enableRotation, setEnableRotation] = useState();
  const [enableZoomLimits, setEnableZoomLimits] = useState();
  const [envmap, setEnvmap] = useState();
  const [envmapOverrideName, setEnvmapOverrideName] = useState();
  const [envmapStrength, setEnvmapStrength] = useState();
  const [toneMapping, setToneMapping] = useState();
  const [toneMappingExposure, setToneMappingExposure] = useState();
  const [trackCamera, setTrackCamera] = useState();

  // reset most overrides on change of asset type
  useEffect(() => {
    setBloomRadius();
    setBloomStrength();
    setEnableDefaultLights();
    setEnablePostprocessing();
    setEnableRotation();
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
      bloomRadius,
      bloomStrength,
      enableDefaultLights,
      enablePostprocessing,
      enableRotation,
      enableZoomLimits,
      envmap,
      envmapOverrideName,
      envmapStrength,
      toneMapping,
      toneMappingExposure,
      trackCamera
    },
    setAssetType,
    setModelUrl,
    setBackground,
    setBackgroundOverrideName,
    setBloomRadius,
    setBloomStrength,
    setEnableDefaultLights,
    setEnablePostprocessing,
    setEnableRotation,
    setEnableZoomLimits,
    setEnvmap,
    setEnvmapOverrideName,
    setEnvmapStrength,
    setToneMapping,
    setToneMappingExposure,
    setTrackCamera
  }), [
    assetType,
    modelUrl,
    background,
    backgroundOverrideName,
    bloomRadius,
    bloomStrength,
    enableDefaultLights,
    enablePostprocessing,
    enableRotation,
    enableZoomLimits,
    envmap,
    envmapOverrideName,
    envmapStrength,
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