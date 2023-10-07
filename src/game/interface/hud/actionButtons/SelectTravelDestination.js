import { useCallback, useEffect } from 'react';

import { SimulateRouteIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SelectTravelDestination = ({}) => {
  const origin = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const openHudMenu = useStore(s => s.asteroids.openHudMenu);
  const inTravelMode = useStore(s => s.asteroids.travelMode);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchTravelMode = useStore(s => s.dispatchTravelMode);
  
  const handleClick = useCallback(() => {
    dispatchTravelMode(!inTravelMode);
  }, [inTravelMode]);

  useEffect(() => {
    if (openHudMenu) return;
    if (origin && destination && inTravelMode) {
      dispatchHudMenuOpened('BELT_PLAN_FLIGHT');
    }
  }, [destination, inTravelMode, origin]);

  return (
    <ActionButton
      flags={{ active: !!inTravelMode }}
      label={origin && destination && inTravelMode ? 'Cancel Planning' : 'Plan Flight'}
      icon={<SimulateRouteIcon />}
      onClick={handleClick} />
  );
};

export default SelectTravelDestination;