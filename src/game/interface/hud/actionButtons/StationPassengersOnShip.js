import { useCallback } from 'react';

import { StationPassengersIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const StationPassengersOnShip = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('STATION_ON_SHIP');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Station Passengers on Ship"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? ship permissions?
        loading: false, // TODO: ...
      }}
      icon={<StationPassengersIcon />}
      onClick={handleClick} />
  );
};

export default StationPassengersOnShip;