import { useContext, useEffect } from 'react';

import DevToolContext from '~/contexts/DevToolContext';
import ModelViewer from '../ModelViewer';

const DevToolsViewer = () => {
  const { assetType, overrides, ...setters } = useContext(DevToolContext);

  useEffect(() => {
    if (!assetType) {
      setters.setAssetType('scene');
    }
  }, [assetType]);

  if (!assetType || assetType === 'scene') return null;
  return (
    <ModelViewer key={assetType} assetType={assetType} {...overrides} />
  );
}

export default DevToolsViewer;
        