import { useContext, useEffect } from 'react';

import DevToolContext from '~/contexts/DevToolContext';
import ModelViewer from '../ModelViewer';

const DevToolsViewer = () => {
  const { overrides, ...setters } = useContext(DevToolContext);

  useEffect(() => {
    if (!overrides.assetType) {
      setters.setAssetType('scene');
    }
  }, [overrides.assetType]);

  if (!overrides.assetType || overrides.assetType === 'scene') return null;
  return (
    <ModelViewer key={overrides.assetType} {...overrides} />
  );
}

export default DevToolsViewer;
        