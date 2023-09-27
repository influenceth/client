import { useCallback } from 'react';

import { EmergencyModeEnterIcon, EmergencyModeExitIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const EmergencyModeToggle = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('EMERGENCY_MODE_TOGGLE');
  }, [onSetAction]);

  const inMode = false;

  return (
    <ActionButton
      label={`${inMode ? 'Exit' : 'Enter'} Emergency Mode`}
      flags={{
        disabled: false, // TODO: ... crew not on asteroid? ship permissions?
        loading: false, // TODO: ...
      }}
      icon={inMode ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />}
      onClick={handleClick} />
  );
};

export default EmergencyModeToggle;