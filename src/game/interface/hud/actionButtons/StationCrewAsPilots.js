import { useCallback } from 'react';

import { StationCrewIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const StationCrewAsPilots = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('STATION_CREW');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Station Flight Crew on Ship"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? crew already on ship? ship ownership?
        loading: false, // TODO: ...
      }}
      icon={<StationCrewIcon />}
      onClick={handleClick} />
  );
};

export default StationCrewAsPilots;