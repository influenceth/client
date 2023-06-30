import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';

import ModelViewer from '../ModelViewer';

const LinkedViewer = () => {
  const { assetType, assetName } = useParams();

  const assetDictionary = {};
  assetDictionary.building = useBuildingAssets();
  assetDictionary.resource = useResourceAssets();
  assetDictionary.ship = useShipAssets();

  const modelUrl = useMemo(() => {
    const asset = assetDictionary[assetType].find((a) => a.name === assetName);
    return asset?.modelUrl;
  }, [assetName, assetType]);

  return (
    <ModelViewer assetType={assetType} modelUrl={modelUrl} />
  );
}

export default LinkedViewer;
        