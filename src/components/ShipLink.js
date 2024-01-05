import { useCallback, useMemo } from 'react';
import { Entity, Ship } from '@influenceth/sdk';

import useOwnedShips from '~/hooks/useOwnedShips';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import { useLotLink } from './LotLink';
import OnClickLink from './OnClickLink';
import EntityName from './EntityName';

export const useShipLink = ({ shipId, zoomToShip }) => {
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);  

  const { data: ship } = useShip(shipId);

  const zoomToAsteroid = useLotLink({ asteroidId: ship?._location?.asteroidId });

  const zoomToLot = useLotLink({ lotId: ship?._location?.lotId });

  const zoomToShipAsNeeded = useCallback(() => {
    if (!ship) return;

    // if ship is in_flight, zoom "out", show zoomScene of ship
    if (ship.Ship?.transitDeparture > 0) {
      // TODO (later): zoom to ship location or at least show reticule on it
      if (zoomStatus === 'in') updateZoomStatus('zooming-out');

    // if ship is in_port / on_surface, zoom to lot, show zoomScene of ship
    } else if (!!ship?._location.lotId) {
      zoomToLot();

    // if ship is landing/launching/in_orbit, zoom to asteroid, show zoomScene of ship
    } else {
      // TODO (later): zoom to one of the circling "dots" in the orbit line
      zoomToAsteroid();
    }

    // show zoomScene of ship
    if (zoomToShip && !(currentZoomScene?.type === 'SHIP' && currentZoomScene?.shipId === ship.id)) {
      setTimeout(() => {
        dispatchZoomScene(zoomToShip ? { type: 'SHIP', shipId: ship.id } : null);

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

export const ShipLink = ({ shipId, zoomToShip }) => {
  const onClick = useShipLink({ shipId, zoomToShip });

  const { data: owned, isLoading: ownedAreLoading } = useOwnedShips();
  const shipName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.id === Number(shipId));
      return match?.name || `Ship #${shipId.toLocaleString()}`;
    }
    return null;
  }, [ owned, shipId ])

  return (
    <OnClickLink onClick={onClick}>
      {ownedAreLoading
        ? `Ship #${shipId.toLocaleString()}`
        : (shipName || <EntityName id={shipId} label={Entity.IDS.SHIP} />)}
    </OnClickLink>
  );
};

export default ShipLink;
