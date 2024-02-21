import { useCallback, useEffect } from 'react';

import { SimulateRouteIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import useShipTravelManager from '~/hooks/actionManagers/useShipTravelManager';

const isVisible = ({ asteroid, crew, ship, zoomStatus }) => {
  return crew && (
    (asteroid && zoomStatus === 'out') || (
      ship
      && ship.Control?.controller?.id === crew.id
      && !ship._location.lotId  // in orbit
    )
  );
};

const SelectTravelDestination = ({ crew }) => {
  const { travelStatus } = useShipTravelManager(crew?._location?.shipId);
  const origin = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const inTravelMode = useStore(s => s.asteroids.travelMode);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchTravelMode = useStore(s => s.dispatchTravelMode);
  const dispatchZoomStatusChanged = useStore(s => s.dispatchZoomStatusChanged);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const canSelect = inTravelMode && zoomStatus === 'out';

  const handleClick = useCallback(() => {
    if (zoomStatus !== 'out') {
      dispatchZoomStatusChanged('zooming-out');
      dispatchTravelMode(true);
    } else if (canSelect) {
      dispatchTravelMode(false);
      dispatchDestinationSelected();
      dispatchHudMenuOpened();
    } else {
      dispatchTravelMode(true);
    }
  }, [dispatchTravelMode, dispatchDestinationSelected, dispatchHudMenuOpened, inTravelMode, zoomStatus]);

  useEffect(() => {
    if (origin && destination && inTravelMode) {
      dispatchHudMenuOpened('BELT_PLAN_FLIGHT');
    }
  }, [dispatchHudMenuOpened, destination, inTravelMode, origin]);

  const canBeReal = (crew?._location?.shipId || crew?.Ship.emergencyAt > 0) && travelStatus === 'READY';
  const planOrSimulate = canBeReal ? 'Create' : 'Simulate';
  const planningOrSimulation = canBeReal ? 'Planning' : 'Simulation';

  // TODO: ever disable this? probably not, but maybe if specific
  //  ship is selected and uncrewed or something?
  return (
    <ActionButton
      flags={{ active: !!canSelect }}
      label={canSelect ? `Cancel ${planningOrSimulation}` : `${planOrSimulate} Flight Plans`}
      icon={<SimulateRouteIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SelectTravelDestination, isVisible };
