import { useCallback } from 'react';

import { RocketIcon } from '~/components/Icons';
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
    if (inTravelMode) {
      dispatchHudMenuOpened(openHudMenu !== 'BELT_SIMULATE_ROUTE' ? 'BELT_SIMULATE_ROUTE' : null);
    } else {
      dispatchTravelMode(true);
    }
  }, [inTravelMode]);

  return (
    <ActionButton
      flags={{
        active: !!inTravelMode,
        disabled: inTravelMode && !destination
      }}
      label={origin && destination && inTravelMode ? 'Simulate Route' : 'Plan Flight'}
      icon={<RocketIcon />}
      onClick={handleClick} />
  );
};

export default SelectTravelDestination;