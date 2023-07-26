import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Building, Product, Ship } from '@influenceth/sdk';

import { getBuildingModel, getProductModel, getShipModel } from '~/lib/assetUtils';
import ModelViewer from '../ModelViewer';

const LinkedViewer = () => {
  const { assetType, assetName } = useParams();

  const modelUrl = useMemo(() => {
    if (assetType === 'building') {
      return getBuildingModel(Object.keys(Building.TYPES).find((i) => Building.TYPES[i].name === assetName));
    } else if (assetType === 'resource') {
      return getProductModel(Object.keys(Product.TYPES).find((i) => Product.TYPES[i].name === assetName));
    } else if (assetType === 'ship') {
      return getShipModel(Object.keys(Ship.TYPES).find((i) => Ship.TYPES[i].name === assetName));
    }
    return '';
  }, [assetName, assetType]);

  return (
    <ModelViewer assetType={assetType} modelUrl={modelUrl} />
  );
}

export default LinkedViewer;
        