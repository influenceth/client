import { useCallback, useEffect, useMemo } from 'react';

import useOwnedShips from '~/hooks/useOwnedShips';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import { useLotLink } from './LotLink';
import OnClickLink from './OnClickLink';

export const useShipLink = ({ shipId, zoomToShip }) => {
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);  

  const { data: ship } = useShip(shipId);

  const zoomToAsteroid = useLotLink({
    asteroidId: ship?.asteroid
  });

  const zoomToLot = useLotLink({
    asteroidId: ship?.asteroid,
    lotId: ship?.lot,
  });

  const zoomToShipAsNeeded = useCallback(() => {
    if (!ship) return;

    // if ship is in_flight, zoom "out", show zoomScene of ship
    if (ship.status === 'IN_FLIGHT') {
      // TODO (later): zoom to ship location or at least show reticule on it
      if (zoomStatus === 'in') updateZoomStatus('zooming-out');

    // if ship is in_port / on_surface, zoom to lot, show zoomScene of ship
    } else if (['IN_PORT', 'ON_SURFACE'].includes(ship.status)) {
      zoomToLot();

    // if ship is landing/launching/in_orbit, zoom to asteroid, show zoomScene of ship
    } else {
      // TODO (later): zoom to one of the circling "dots" in the orbit line
      zoomToAsteroid();
    }

    // show zoomScene of ship
    if (zoomToShip && !(currentZoomScene?.type === 'SHIP' && currentZoomScene?.shipId === ship.i)) {
      setTimeout(() => {
        dispatchZoomScene(zoomToShip ? { type: 'SHIP', shipId: ship.i } : null);

        // if this is not just a boolean, it is assumed to be a hudmenu to open upon arrival
        if (zoomToShip && zoomToShip !== true) {
          setTimeout(() => {
            dispatchHudMenuOpened(zoomToShip);
          }, 0);
        }
      }, 500);
    }
  }, [currentZoomScene, ship, zoomToAsteroid, zoomToLot, zoomToShip, dispatchZoomScene, dispatchHudMenuOpened]);

  return zoomToShipAsNeeded;
}

const ShipName = ({ shipId }) => {
  const { data: ship } = useShip(shipId);
  return (
    <>
      {ship?.name || `Ship #${shipId.toLocaleString()}`}
    </>
  );
};

export const ShipLink = ({ shipId, zoomToShip }) => {
  const onClick = useShipLink({ shipId, zoomToShip });

  const { data: owned, isLoading: ownedAreLoading } = useOwnedShips();
  const shipName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(shipId));
      return match?.name || `Ship #${shipId.toLocaleString()}`;
    }
    return null;
  }, [ owned, shipId ])

  return (
    <OnClickLink onClick={onClick}>
      {ownedAreLoading
        ? `Ship #${shipId.toLocaleString()}`
        : (shipName || <ShipName shipId={shipId} />)}
    </OnClickLink>
  );
};

export default ShipLink;
