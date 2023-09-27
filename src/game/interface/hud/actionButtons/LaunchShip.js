import { useCallback } from 'react';

import { LaunchShipIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const LaunchShip = ({ onSetAction }) => {
  
  const handleClick = useCallback(() => {
    onSetAction('LAUNCH_SHIP');
  }, []);

  // TODO: disable if insufficient propellant to launch or don't have a crew in ship
  return (
    <ActionButton
      flags={{
        disabled: false // TODO: ...
      }}
      label="Launch Ship"
      icon={<LaunchShipIcon />}
      onClick={handleClick} />
  );
};

export default LaunchShip;