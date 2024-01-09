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

const isVisible = ({ building, constructionStatus, crew }) => {
  // zoomStatus === 'in'?
  return crew && building
    && building.Control?.controller?.id === crew.id
    && building.DryDocks?.length > 0
    && constructionStatus === 'OPERATIONAL';
};

const Component = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { assemblyStatus } = useDryDockManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('ASSEMBLE_SHIP');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[assemblyStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        attention: assemblyStatus === 'READY_TO_FINISH' || undefined,
        loading: assemblyStatus === 'ASSEMBLING' || assemblyStatus === 'FINISHING' || undefined
      }}
      icon={<ShipIcon />}
      onClick={handleClick} />
  );
};

export default { Component, isVisible };