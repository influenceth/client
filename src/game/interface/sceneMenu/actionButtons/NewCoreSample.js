import { useCallback } from 'react';

import { CoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import ActionButton from './ActionButton';

const NewCoreSample = ({ asteroid, plot, onSetAction }) => {
  const { samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE');
  }, [onSetAction]);

  const attention = samplingStatus === 'READY_TO_FINISH';
  const loading = samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING';
  return (
    <ActionButton
      label={samplingStatus === 'READY_TO_FINISH' ? 'Analyze Core Sample' : 'New Core Sample'}
      flags={{
        attention: attention || undefined,
        loading: loading || undefined
      }}
      icon={<CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;