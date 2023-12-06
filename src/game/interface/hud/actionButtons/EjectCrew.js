import { useCallback } from 'react';

import { EjectPassengersIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const EjectCrew = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('EJECT_CREW');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Eject My Crew"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? ship permissions? crew ready?
        loading: false, // TODO: ...
      }}
      icon={<EjectPassengersIcon />}
      onClick={handleClick} />
  );
};

export default EjectCrew;