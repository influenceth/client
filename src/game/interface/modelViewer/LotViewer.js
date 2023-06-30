import { useMemo } from 'react';
import { Capable, Construction } from '@influenceth/sdk';

import { useBuildingAssets } from '~/hooks/useAssets';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';

const LotViewer = () => {
  const buildings = useBuildingAssets();
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: lot, isLoading } = useLot(asteroidId, lotId);

  const modelUrl = useMemo(() => {
    if (lot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      const asset = buildings.find((a) => a.name === lot.building.__t);
      if (asset) {
        return asset.modelUrl;
      }
    }
    return buildings[0]?.modelUrl;
  }, [lot?.building]);

  if (zoomScene?.type !== 'LOT' || isLoading) return null;
  return (
    <ModelViewer assetType="building" modelUrl={modelUrl} />
  );
}

export default LotViewer;
        