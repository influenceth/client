import { useMemo } from 'react';
import { Building } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';
import { getBuildingModel } from '~/lib/assetUtils';

const LotViewer = () => {
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: lot, isLoading } = useLot(asteroidId, lotId);

  const modelUrl = useMemo(() => {
    if (lot?.building?.construction?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      const asset = Building.TYPES.find((a) => a.name === lot.building.__t);
      if (asset) {
        return getBuildingModel(asset.i);
      }
    }
    return getBuildingModel(0);
  }, [lot?.building]);

  if (zoomScene?.type !== 'LOT' || isLoading) return null;
  return (
    <ModelViewer assetType="building" modelUrl={modelUrl} />
  );
}

export default LotViewer;
        