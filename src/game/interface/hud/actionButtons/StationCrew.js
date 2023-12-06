import { useCallback } from 'react';

import { StationCrewIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const StationCrew = ({ asteroid, crew, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('STATION_CREW');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Station Crew"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? crew already on ship? ship ownership? crew._ready?
        loading: false, // TODO: ...
      }}
      icon={<StationCrewIcon />}
      onClick={handleClick} />
  );
};

export default StationCrew;