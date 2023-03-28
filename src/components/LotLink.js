import { useCallback, useEffect, useMemo, useState } from 'react';

import useAsteroid from '~/hooks/useAsteroid';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

export const useLotLink = ({ asteroidId, lotId, resourceId, zoomToLot }) => {
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const dispatchZoomToLot = useStore(s => s.dispatchZoomToLot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const openHudMenu = useStore(s => s.asteroids.openHudMenu);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const currentlyZoomedToLot = useStore(s => s.asteroids.zoomToLot);

  const selectResourceMapAsNeeded = useCallback(() => {
    if (resourceId) {
      dispatchResourceMapSelect(resourceId);
      dispatchResourceMapToggle(true);
    }
  }, [resourceId, dispatchResourceMapSelect, dispatchResourceMapToggle, dispatchHudMenuOpened, openHudMenu]);

  const zoomToLotAsNeeded = useCallback(() => {
    if (zoomToLot !== currentlyZoomedToLot) {
      dispatchZoomToLot(!!zoomToLot);

      // if this is not just a boolean, it is assumed to be a hudmenu to open upon arrival
      if (zoomToLot && zoomToLot !== true) {
        setTimeout(() => {
          dispatchHudMenuOpened(`lot.${zoomToLot}`);
        }, 0);
      }
    }
  }, [zoomToLot, currentlyZoomedToLot, dispatchZoomToLot, dispatchHudMenuOpened]);

  return useCallback(() => {
    // if already zoomed into asteroid, just select lot and select resource map
    if (asteroidId === origin && zoomStatus === 'in') {
      dispatchLotSelected(asteroidId, lotId);
      selectResourceMapAsNeeded();
      setTimeout(() => {
        zoomToLotAsNeeded();
      }, 500);

    // else, start zooming to asteroid... once on the way, it will also select the lot in the above effect
    } else {
      dispatchOriginSelected(asteroidId);
      if (zoomStatus === 'out') updateZoomStatus('zooming-in');

      setTimeout(() => {
        if (lotId) {
          dispatchLotSelected(asteroidId, lotId);
          selectResourceMapAsNeeded();
          zoomToLotAsNeeded();
        } else {
          selectResourceMapAsNeeded();
        }
      }, 0);
    }
  }, [asteroidId, lotId, selectResourceMapAsNeeded, zoomToLotAsNeeded, zoomStatus]);
}

const AsteroidName = ({ asteroidId }) => {
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      {asteroid?.customName || asteroid?.baseName || `Asteroid #${(asteroidId || 0).toLocaleString()}`}
    </>
  );
};

export const LotLink = ({ asteroidId, lotId, resourceId, zoomToLot }) => {
  const onClick = useLotLink({ asteroidId, lotId, resourceId, zoomToLot });

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
      {' '}#{lotId ? lotId.toLocaleString() : '?'}
    </OnClickLink>
  );
};

export default LotLink;
