import { useCallback, useEffect, useMemo, useState } from 'react';

import useAsteroid from '~/hooks/useAsteroid';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

export const usePlotLink = ({ asteroidId, plotId, resourceId }) => {
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const [destination, setDestination] = useState();

  const selectResourceMapAsNeeded = useCallback(() => {
    if (resourceId) {
      dispatchResourceMapSelect(resourceId);
      dispatchResourceMapToggle(true);
    }
  }, [resourceId, dispatchResourceMapSelect, dispatchResourceMapToggle]);

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

const AsteroidName = ({ asteroidId }) => {
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      {asteroid?.customName || asteroid?.baseName || `Asteroid #${(asteroidId || 0).toLocaleString()}`}
    </>
  );
};

export const PlotLink = ({ asteroidId, plotId, resourceId }) => {
  const onClick = usePlotLink({ asteroidId, plotId, resourceId });

  const { data: owned, isLoading: ownedAreLoading } = useOwnedAsteroids();
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
      {ownedAreLoading
        ? `Asteroid #${asteroidId.toLocaleString()}`
        : (asteroidName || <AsteroidName asteroidId={asteroidId} />)}
      {' '}#{plotId ? plotId.toLocaleString() : '?'}
    </OnClickLink>
  );
};

export default PlotLink;
