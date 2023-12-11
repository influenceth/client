import { useCallback } from 'react';
import { Lot } from '@influenceth/sdk';

import { ShipIcon } from '~/components/Icons';
import useDryDockManager from '~/hooks/actionManagers/useDryDockManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Assemble Ship',
  ASSEMBLING: 'Assembling Ship...',
  READY_TO_FINISH: 'Finish Ship Assembly',
  FINISHING: 'Finishing Ship Assembly...'
};

const AssembleShip = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { assemblyStatus } = useDryDockManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('ASSEMBLE_SHIP');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[assemblyStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        loading: assemblyStatus === 'ASSEMBLING' || assemblyStatus === 'FINISHING' || undefined
      }}
      icon={<ShipIcon />}
      onClick={handleClick} />
  );
};

export default AssembleShip;