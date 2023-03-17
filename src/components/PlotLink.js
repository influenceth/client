import { useCallback, useEffect, useMemo, useState } from 'react';

import useAsteroid from '~/hooks/useAsteroid';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

export const usePlotLink = ({ asteroidId, plotId, resourceId, zoomToPlot }) => {
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const openHudMenu = useStore(s => s.asteroids.openHudMenu);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const currentlyZoomedToPlot = useStore(s => s.asteroids.zoomToPlot);

  const selectResourceMapAsNeeded = useCallback(() => {
    if (resourceId) {
      dispatchResourceMapSelect(resourceId);
      dispatchResourceMapToggle(true);
    }
  }, [resourceId, dispatchResourceMapSelect, dispatchResourceMapToggle, dispatchHudMenuOpened, openHudMenu]);

  const zoomToPlotAsNeeded = useCallback(() => {
    if (zoomToPlot !== currentlyZoomedToPlot) {
      dispatchZoomToPlot(!!zoomToPlot);

      // if this is not just a boolean, it is assumed to be a hudmenu to open upon arrival
      if (zoomToPlot && zoomToPlot !== true) {
        setTimeout(() => {
          dispatchHudMenuOpened(`lot.${zoomToPlot}`);
        }, 0);
      }
    }
  }, [zoomToPlot, currentlyZoomedToPlot, dispatchZoomToPlot, dispatchHudMenuOpened]);

  return useCallback(() => {
    // if already zoomed into asteroid, just select lot and select resource map
    if (asteroidId === origin && zoomStatus === 'in') {
      dispatchPlotSelected(asteroidId, plotId);
      selectResourceMapAsNeeded();
      setTimeout(() => {
        zoomToPlotAsNeeded();
      }, 500);

    // else, start zooming to asteroid... once on the way, it will also select the plot in the above effect
    } else {
      dispatchOriginSelected(asteroidId);
      if (zoomStatus === 'out') updateZoomStatus('zooming-in');

      setTimeout(() => {
        if (plotId) {
          dispatchPlotSelected(asteroidId, plotId);
          selectResourceMapAsNeeded();
          zoomToPlotAsNeeded();
        } else {
          selectResourceMapAsNeeded();
        }
      }, 0);
    }
  }, [asteroidId, plotId, selectResourceMapAsNeeded, zoomToPlotAsNeeded, zoomStatus]);
}

const AsteroidName = ({ asteroidId }) => {
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      {asteroid?.customName || asteroid?.baseName || `Asteroid #${(asteroidId || 0).toLocaleString()}`}
    </>
  );
};

export const PlotLink = ({ asteroidId, plotId, resourceId, zoomToPlot }) => {
  const onClick = usePlotLink({ asteroidId, plotId, resourceId, zoomToPlot });

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
