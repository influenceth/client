import { useCallback, useMemo } from 'react';
import { Permission } from '@influenceth/sdk';

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
  return crew && building && building.DryDocks?.length > 0;
};

const AssembleShip = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { assemblyStatus, currentAssembly } = useDryDockManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('ASSEMBLE_SHIP');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (assemblyStatus === 'READY') {
      return getCrewDisabledReason({
        asteroid, crew, isSequenceable: true, permission: Permission.IDS.ASSEMBLE_SHIP, permissionTarget: lot?.building
      });
    } else if (!currentAssembly?._isMyAction) {
      return 'in use';
    }
  }, [_disabled, assemblyStatus, asteroid, crew, currentAssembly, lot?.building]);

  return (
    <ActionButton
      label={labelDict[assemblyStatus]}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        attention: !_disabled && assemblyStatus === 'READY_TO_FINISH',
        loading: assemblyStatus === 'ASSEMBLING' || assemblyStatus === 'FINISHING'
      }}
      icon={<ShipIcon />}
      onClick={handleClick}
      sequenceMode={!crew?._ready} />
  );
};

export default { Component: AssembleShip, isVisible };