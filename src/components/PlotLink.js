import { useCallback, useEffect, useMemo, useState } from 'react';

import { useResourceAssets } from '~/hooks/useAssets';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

export const usePlotLink = ({ asteroidId, plotId, resourceId }) => {
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const resources = useResourceAssets();

  const [destination, setDestination] = useState();

  const selectResourceMapAsNeeded = useCallback(() => {
    if (resourceId && resources[resourceId]) {
      dispatchResourceMap(resources[resourceId]);
    }
  }, [resourceId, resources]);

  useEffect(() => {
    if (destination && zoomStatus === 'zooming-in') {
      dispatchPlotSelected(asteroidId, plotId);
      selectResourceMapAsNeeded();
      setDestination();
    }
  }, [asteroidId, destination, plotId, selectResourceMapAsNeeded, zoomStatus]);

  return useCallback(() => {
    if (asteroidId === origin && zoomStatus === 'in') {
      dispatchPlotSelected(asteroidId, plotId);
      selectResourceMapAsNeeded();
    } else {
      dispatchOriginSelected(asteroidId);
      if (zoomStatus === 'out') updateZoomStatus('zooming-in');
      setDestination(plotId);
    }
  }, [asteroidId, plotId, selectResourceMapAsNeeded, zoomStatus]);
}

export const PlotLink = ({ asteroidId, plotId, resourceId }) => {
  const onClick = usePlotLink({ asteroidId, plotId, resourceId });

  const { data: owned } = useOwnedAsteroids();
  const asteroidName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(asteroidId));
      if (match) {
        return match.customName || match.baseName;
      }
    }
    return null;
  }, [ owned, asteroidId ])

  return (
    <OnClickLink onClick={onClick}>
      {asteroidName || `Asteroid #${asteroidId}`} #{plotId ? plotId.toLocaleString() : '?'}
    </OnClickLink>
  );
};

export default PlotLink;
