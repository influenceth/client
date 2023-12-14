import { useCallback, useEffect, useMemo } from 'react';
import { Processor } from '@influenceth/sdk';

import { getProcessorProps } from '~/lib/utils';
import ActionButton from './ActionButton';
import useProcessManager from '~/hooks/actionManagers/useProcessManager';

const Button = ({ asteroid, crew, lot, processor, onSetAction, _disabled }) => {
  const { processStatus } = useProcessManager(lot?.id, processor.slot);
  const handleClick = useCallback(() => {
    onSetAction('PROCESS', { processorSlot: processor.slot });
  }, [onSetAction, processor]);

  const buttonProps = useMemo(() => getProcessorProps(processor?.processorType), [processor?.processorType]);

  let disabledReason = useMemo(() => {
    if (processStatus === 'READY') {
      // TODO: ... crew not on asteroid, etc
      if (!crew?._ready) return 'crew is busy';
      return '';
    }
  }, [crew?._ready]);

  const loading = ['PROCESSING', 'FINISHING'].includes(processStatus);
  return (
    <>
      <ActionButton
        {...buttonProps}
        flags={{
          disabled: _disabled || disabledReason || undefined,
          loading: loading || undefined,
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

export default Processors;