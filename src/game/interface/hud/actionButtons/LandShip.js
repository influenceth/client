import { useCallback } from 'react';

import { LandShipIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const LandShip = ({ onSetAction }) => {
  
  const handleClick = useCallback(() => {
    onSetAction('LAND_SHIP');
  }, []);

  // TODO: disable if insufficient propellant to land, don't have permission to land,
  //  no crew on board, or not a valid landing location for this type of ship
  return (
    <ActionButton
      flags={{
        disabled: false // TODO: ...
      }}
      label="Land Ship"
      icon={<LandShipIcon />}
      onClick={handleClick} />
  );
};

export default LandShip;