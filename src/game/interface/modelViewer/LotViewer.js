import { useMemo } from 'react';
import { Building } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';
import { getBuildingModel } from '~/lib/assetUtils';

const LotViewer = () => {
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: lot, isLoading } = useLot(lotId);

  const modelUrl = useMemo(() => {
    if (zoomScene?.overrides?.buildingType) {
      return getBuildingModel(zoomScene.overrides.buildingType);  
    }
    if (lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      return getBuildingModel(lot.building.Building.buildingType);
    }
    return getBuildingModel(0);
  }, [lot?.building?.Building, zoomScene?.overrides?.buildingType]);

  if (zoomScene?.type !== 'LOT' || isLoading) return null;
  return (
    <ModelViewer assetType="building" modelUrl={modelUrl} />
  );
}

export default LotViewer;
