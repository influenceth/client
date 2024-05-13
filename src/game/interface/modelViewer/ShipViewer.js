import { useMemo } from 'react';
import { Ship } from '@influenceth/sdk';

import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';
import { getShipModel } from '~/lib/assetUtils';

const ShipViewer = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship, isLoading } = useShip(zoomScene?.shipId);

  const modelUrl = useMemo(() => {
    return getShipModel(
      zoomScene?.shipId ? ship?.Ship?.shipType : Ship.IDS.ESCAPE_MODULE,
      ship?.Ship?.variant
    );
  }, [ship?.Ship?.shipType, ship?.Ship?.variant]);

  if (zoomScene?.type !== 'SHIP' || isLoading) return null;
  return (
    <ModelViewer assetType="ship" modelUrl={modelUrl} />
  );
}

export default ShipViewer;
