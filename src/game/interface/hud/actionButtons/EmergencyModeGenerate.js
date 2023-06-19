import { useCallback } from 'react';

import { EjectPassengersIcon, EmergencyModeGenerateIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const EmergencyModeGenerate = ({ asteroid, lot, onSetAction }) => {
  const handleClick = useCallback(() => {
    onSetAction('EMERGENCY_MODE_GENERATE');
  }, [onSetAction]);


  // TODO: 

  return (
    <ActionButton
      label="Generate Emergency Propellant"
      flags={{
        attention: true,  // TODO: only if < 10% propellant
        disabled: false, // TODO: ... crew not on asteroid? ship permissions?
        loading: false, // TODO: ...
      }}
      icon={<EmergencyModeGenerateIcon />}
      onClick={handleClick} />
  );
};

export default EmergencyModeGenerate;