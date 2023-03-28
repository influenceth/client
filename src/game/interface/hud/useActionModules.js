import { Construction } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';

const useActionModules = () => {
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToLot = useStore(s => s.asteroids.zoomToLot);
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const { data: lot } = useLot(asteroidId, zoomToLot ? lotId : null);

  return {
    resourceMapSelector: zoomStatus === 'in' && !zoomToLot && resourceMap?.active,
    lotInventory: zoomStatus === 'in' && zoomToLot && lot?.building?.capableType === 1 && lot?.building?.construction?.status === Construction.STATUS_OPERATIONAL
  };
}

export default useActionModules;