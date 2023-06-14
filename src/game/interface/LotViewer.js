import { Construction } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ModelViewer from './ModelViewer';

const LotViewer = () => {
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: lot, isLoading } = useLot(asteroidId, lotId);

  if (zoomScene?.type !== 'LOT' || isLoading) return null;

  const building = lot?.building?.construction?.status === Construction.STATUS_OPERATIONAL
    ? lot.building.__t
    : 'Empty Lot';
  return (
    <ModelViewer assetType="Building" inGameMode={building} />
  );
}

export default LotViewer;
        