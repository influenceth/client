import { useCallback, useEffect, useMemo } from 'react';
import { Permission, Processor } from '@influenceth/sdk';

import { getProcessorProps } from '~/lib/utils';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';

const isVisible = ({ building, crew }) => {
  return crew && building && building.Processors?.length > 0;
};

const Button = ({ asteroid, crew, lot, processor, onSetAction, simulation, simulationActions, _disabled }) => {
  const { currentProcess, processStatus } = useProcessManager(lot?.id, processor.slot);
  const setCoachmarkRef = useCoachmarkRefSetter();

  const handleClick = useCallback(() => {
    onSetAction('PROCESS', { processorSlot: processor.slot });
  }, [onSetAction, processor]);

  const buttonProps = useMemo(() => getProcessorProps(processor?.processorType), [processor?.processorType]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (processStatus === 'READY') {
      return getCrewDisabledReason({
        asteroid, crew,
        isSequenceable: true,
        isAllowedInSimulation: simulationActions.includes(`Process:${processor?.processorType}`),
        permission: Permission.IDS.RUN_PROCESS,
        permissionTarget: lot?.building
      });
    } else if (!currentProcess?._isAccessible) {
      return 'in use';
    }
  }, [asteroid, crew, currentProcess, processor?.processorType, processStatus, simulationActions]);

  const loading = ['PROCESSING', 'FINISHING'].includes(processStatus);
  return (
    <>
      <ActionButton
        ref={simulationActions.includes(`Process:${processor?.processorType}`) ? setCoachmarkRef(COACHMARK_IDS.actionButtonProcess) : undefined}
        {...buttonProps}
        labelAddendum={disabledReason}
        flags={{
          attention: !disabledReason && (simulation || processStatus === 'READY_TO_FINISH'),
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
