import { useCallback, useEffect, useMemo } from 'react';
import { Permission, Processor } from '@influenceth/sdk';

import { getProcessorProps } from '~/lib/utils';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';

const isVisible = ({ building, crew }) => {
  return crew && building && building.Processors?.length > 0;
};

const Button = ({ asteroid, blockTime, crew, lot, processor, onSetAction, _disabled }) => {
  const { currentProcess, processStatus } = useProcessManager(lot?.id, processor.slot);
  const handleClick = useCallback(() => {
    onSetAction('PROCESS', { processorSlot: processor.slot });
  }, [onSetAction, processor]);

  const buttonProps = useMemo(() => getProcessorProps(processor?.processorType), [processor?.processorType]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (processStatus === 'READY') {
      return getCrewDisabledReason({ asteroid, blockTime, crew, isSequenceable: true, permission: Permission.IDS.RUN_PROCESS, permissionTarget: lot?.building });
    } else if (!currentProcess?._isAccessible) {
      return 'in use';
    }
  }, [asteroid, blockTime, crew, currentProcess, processStatus]);

  const loading = ['PROCESSING', 'FINISHING'].includes(processStatus);
  return (
    <>
      <ActionButton
        {...buttonProps}
        labelAddendum={disabledReason}
        flags={{
          attention: processStatus === 'READY_TO_FINISH',
          disabled: disabledReason,
          loading,
          finishTime: processor?.finishTime
        }}
        onClick={handleClick}
        sequenceMode={!crew?._ready && processStatus === 'READY'} />
    </>
  );
};

const Processors = (props) => {
  return (props.lot?.building?.Processors || []).map((processor) => (
    <Button key={processor.slot} {...props} processor={processor} />
  ));
};

export default { Component: Processors, isVisible };
