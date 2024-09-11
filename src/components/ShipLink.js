import { useCallback, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import { ZOOM_OUT_ANIMATION_TIME } from '~/game/scene/Asteroid';
import useCrewShips from '~/hooks/useCrewShips';
import useCrew from '~/hooks/useCrew';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import { useLotLink } from './LotLink';
import OnClickLink from './OnClickLink';
import EntityName from './EntityName';

export const useShipLink = ({ crewId, shipId, zoomToShip }) => {
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const currentZoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);  

  const { data: shipShip } = useShip(shipId);
  const { data: crewShip } = useCrew(shipId ? undefined : crewId);
  const ship = useMemo(import.meta.url, () => shipShip || crewShip, [shipShip, crewShip]);

  const zoomToAsteroid = useLotLink({ asteroidId: ship?._location?.asteroidId });

  const zoomToLot = useLotLink({ lotId: ship?._location?.lotId });

  const zoomToShipAsNeeded = useCallback(import.meta.url, () => {
    if (!ship) return;

    let delayToZoomScene = 500;

    // if ship is in_flight, zoom "out", show zoomScene of ship
    if (ship.Ship?.transitDeparture > 0) {
      // TODO (later): zoom to ship location or at least show reticule on it
      if (zoomStatus === 'in') {
        updateZoomStatus('zooming-out');
        delayToZoomScene += ZOOM_OUT_ANIMATION_TIME;
      }

    // if ship is in_port / on_surface, zoom to lot, show zoomScene of ship
    } else if (!!ship?._location.lotId) {
      zoomToLot();

    // if ship is landing/launching/in_orbit, zoom to asteroid, show zoomScene of ship
    } else {
      // TODO (later): zoom to one of the circling "dots" in the orbit line
      zoomToAsteroid();
    }

    // show zoomScene of ship
    const shipShipId = ship.label === Entity.IDS.SHIP ? ship.id : null;
    if (zoomToShip && !(currentZoomScene?.type === 'SHIP' && currentZoomScene?.shipId === shipShipId)) {
      setTimeout(() => {
        dispatchZoomScene(zoomToShip ? { type: 'SHIP', shipId: shipShipId } : null);

        // if this is not just a boolean, it is assumed to be a hudmenu to open upon arrival
        if (zoomToShip && zoomToShip !== true) {
          setTimeout(() => {
            dispatchHudMenuOpened(zoomToShip);
          }, 0);
        }
      }, delayToZoomScene);
    }
  }, [currentZoomScene, ship, zoomToAsteroid, zoomToLot, zoomToShip, dispatchZoomScene, dispatchHudMenuOpened]);

  return zoomToShipAsNeeded;
}

export const ShipLink = ({ shipId, zoomToShip }) => {
  const onClick = useShipLink({ shipId, zoomToShip });

  const { data: controlled, isLoading: controlledAreLoading } = useCrewShips();
  const shipName = useMemo(import.meta.url, () => {
    if (controlled) {
      const match = controlled.find(a => a.id === Number(shipId));
      return match?.name || `Ship #${shipId.toLocaleString()}`;
    }
    return null;
  }, [ controlled, shipId ])

  return (
    <OnClickLink onClick={onClick}>
      {controlledAreLoading
        ? `Ship #${shipId.toLocaleString()}`
        : (shipName || <EntityName id={shipId} label={Entity.IDS.SHIP} />)}
    </OnClickLink>
  );
};

export default ShipLink;
