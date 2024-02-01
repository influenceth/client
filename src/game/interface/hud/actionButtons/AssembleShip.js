import { useCallback, useMemo } from 'react';

import { ShipIcon } from '~/components/Icons';
import useDryDockManager from '~/hooks/actionManagers/useDryDockManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  READY: 'Assemble Ship',
  ASSEMBLING: 'Assembling Ship...',
  READY_TO_FINISH: 'Finish Ship Assembly',
  FINISHING: 'Finishing Ship Assembly...'
};

const isVisible = ({ building, crew }) => {
  return crew && building
    // && building.Control?.controller?.id === crew.id // TODO: policy instead of control
    && building.DryDocks?.length > 0;
};

const AssembleShip = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { assemblyStatus } = useDryDockManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('ASSEMBLE_SHIP');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (assemblyStatus === 'READY') {
      return getCrewDisabledReason({ asteroid, crew });
    }
  }, [_disabled, assemblyStatus, asteroid, crew]);

  return (
    <ActionButton
      label={labelDict[assemblyStatus]}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        attention: assemblyStatus === 'READY_TO_FINISH',
        loading: assemblyStatus === 'ASSEMBLING' || assemblyStatus === 'FINISHING'
      }}
      icon={<ShipIcon />}
      onClick={handleClick} />
  );
};

export default { Component: AssembleShip, isVisible };