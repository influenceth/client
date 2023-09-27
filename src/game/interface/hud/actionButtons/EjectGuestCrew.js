import { useCallback } from 'react';

import { EjectPassengersIcon } from '~/components/Icons';
import theme from '~/theme';
import ActionButton from './ActionButton';

const EjectCrew = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('EJECT_GUEST_CREW');
  }, [onSetAction]);

  return (
    <ActionButton
      label="Force Eject Crew"
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? ship permissions?
        loading: false, // TODO: ...
      }}
      icon={<EjectPassengersIcon />}
      onClick={handleClick}
      overrideColor={theme.colors.red} />
  );
};

export default EjectCrew;