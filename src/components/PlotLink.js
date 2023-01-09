import { useCallback, useEffect, useMemo, useState } from 'react';

import { useResourceAssets } from '~/hooks/useAssets';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

const PlotLink = (props) => {
  const { asteroidId, plotId, resourceId } = props;
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const { data: owned } = useOwnedAsteroids();
  const resources = useResourceAssets();

  const [destination, setDestination] = useState();

  const asteroidName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(asteroidId));
      if (match) {
        return match.customName || match.baseName;
      }
    }
    return null;
  }, [ owned, asteroidId ])

  const selectResourceMapAsNeeded = useCallback(() => {
    if (resourceId && resources[resourceId]) {
      dispatchResourceMap(resources[resourceId]);
    }
  }, [resourceId, resources]);

  const onClick = useCallback(() => {
    if (asteroidId === origin && zoomStatus === 'in') {
      dispatchPlotSelected(asteroidId, plotId);
      selectResourceMapAsNeeded();
    } else {
      dispatchOriginSelected(asteroidId);
      if (zoomStatus === 'out') updateZoomStatus('zooming-in');
      setDestination(plotId);
    }
  }, [asteroidId, plotId, selectResourceMapAsNeeded, zoomStatus]);

  useEffect(() => {
    if (destination && zoomStatus === 'zooming-in') {
      dispatchPlotSelected(asteroidId, plotId);
      selectResourceMapAsNeeded();
      setDestination();
    }
  }, [asteroidId, destination, plotId, selectResourceMapAsNeeded, zoomStatus]);

  return <OnClickLink onClick={onClick}>{asteroidName || `Asteroid #${asteroidId}`} #{plotId ? plotId.toLocaleString() : '?'}</OnClickLink>;
};

export default PlotLink;
