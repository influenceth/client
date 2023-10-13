import { useCallback, useEffect } from 'react';

import { SimulateRouteIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const SelectTravelDestination = ({}) => {
  const origin = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const inTravelMode = useStore(s => s.asteroids.travelMode);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchTravelMode = useStore(s => s.dispatchTravelMode);

  const handleClick = useCallback(() => {
    if (inTravelMode) {
      dispatchTravelMode(false);
      dispatchDestinationSelected();
      dispatchHudMenuOpened();
    } else {
      dispatchTravelMode(true);
    }
  }, [dispatchTravelMode, dispatchDestinationSelected, dispatchHudMenuOpened, inTravelMode]);

  useEffect(() => {
    if (origin && destination && inTravelMode) {
      dispatchHudMenuOpened('BELT_PLAN_FLIGHT');
    }
  }, [dispatchHudMenuOpened, destination, inTravelMode, origin]);

  return (
    <ActionButton
      flags={{ active: !!inTravelMode }}
      label={inTravelMode ? 'Cancel Planning' : 'Plan Flight'}
      icon={<SimulateRouteIcon />}
      onClick={handleClick} />
  );
};

export default SelectTravelDestination;