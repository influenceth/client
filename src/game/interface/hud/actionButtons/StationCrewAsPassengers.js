import { useCallback } from 'react';

import { StationPassengersIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const StationCrewAsPassengers = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('STATION_PASSENGERS_ON_SHIP');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Station Crew on Ship Passengers"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? ship permissions?
        loading: false, // TODO: ...
      }}
      icon={<StationPassengersIcon />}
      onClick={handleClick} />
  );
};

export default StationCrewAsPassengers;