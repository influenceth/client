import { useContext, useEffect } from 'react';

import DevToolContext from '~/contexts/DevToolContext';
import ModelViewer from '../ModelViewer';

const DevToolsViewer = () => {
  const { overrides, ...setters } = useContext(DevToolContext);

  useEffect(() => {
    if (!overrides.assetType) {
      setters.setAssetType('building');
    }
  }, [overrides.assetType]);

  if (!overrides.assetType) return null;
  return (
    <ModelViewer key={overrides.assetType} {...overrides} />
  );
}

export default DevToolsViewer;
        