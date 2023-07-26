import { useMemo } from 'react';
import { Ship } from '@influenceth/sdk';

import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';

const ShipViewer = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship, isLoading } = useShip(zoomScene?.shipId);

  const modelUrl = useMemo(() => {
    const asset = Object.values(Ship.TYPES).find((s) => s.i === ship?.type);
    return asset?.modelUrl;
  }, [ship?.type]);

  if (zoomScene?.type !== 'SHIP' || isLoading) return null;
  return (
    <ModelViewer assetType="ship" modelUrl={modelUrl} />
  );
}

export default ShipViewer;
        