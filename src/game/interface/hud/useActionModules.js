import { Construction } from '@influenceth/sdk';

import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';

const useActionModules = () => {
  const mapResourceId = useStore(s => s.asteroids.mapResourceId);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot) || {};
  const { data: plot } = usePlot(asteroidId, zoomToPlot ? plotId : null);

  return {
    resourceMapSelector: zoomStatus === 'in' && !zoomToPlot && !!mapResourceId,
    plotInventory: zoomStatus === 'in' && zoomToPlot && plot?.building?.capableType === 1 && plot?.building?.construction?.status === Construction.STATUS_OPERATIONAL
  };
}

export default useActionModules;