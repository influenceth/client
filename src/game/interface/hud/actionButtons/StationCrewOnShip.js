import { useCallback } from 'react';

import { StationCrewIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const StationCrewOnShip = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('STATION_ON_SHIP');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Station Crew on Ship"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? crew already on ship? ship ownership?
        loading: false, // TODO: ...
      }}
      icon={<StationCrewIcon />}
      onClick={handleClick} />
  );
};

export default StationCrewOnShip;