import { useCallback, useEffect, useMemo } from 'react';
import { Processor } from '@influenceth/sdk';

import { getProcessorProps } from '~/lib/utils';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';

const isVisible = ({ building, crew }) => {
  return crew && building
    && building.Control?.controller?.id === crew.id // TODO: policy instead of control
    && building.Processors?.length > 0;
};

const Button = ({ asteroid, crew, lot, processor, onSetAction, _disabled }) => {
  const { processStatus } = useProcessManager(lot?.id, processor.slot);
  const handleClick = useCallback(() => {
    onSetAction('PROCESS', { processorSlot: processor.slot });
  }, [onSetAction, processor]);

  const buttonProps = useMemo(() => getProcessorProps(processor?.processorType), [processor?.processorType]);

  let disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (processStatus === 'READY') {
      return getCrewDisabledReason({ asteroid, crew });
    }
  }, [asteroid, crew]);

  const loading = ['PROCESSING', 'FINISHING'].includes(processStatus);
  return (
    <>
      <ActionButton
        {...buttonProps}
        labelAddendum={disabledReason}
        flags={{
          disabled: disabledReason,
          loading,
          finishTime: processor?.finishTime
        }}
        onClick={handleClick} />
    </>
  );
};

const Processors = (props) => {
  return (props.lot?.building?.Processors || []).map((processor) => (
    <Button key={processor.slot} {...props} processor={processor} />
  ));
};

export default { Component: Processors, isVisible };
