import { useCallback } from 'react';

import { CoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const NewCoreSample = ({ asteroid, plot, onSetAction }) => {
  const resourceMap = useStore(s => s.asteroids.showResourceMap);
  const { lotStatus } = useCoreSampleManager(asteroid?.i, plot?.i, resourceMap?.i);
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE');
  }, [onSetAction]);

  const attention = lotStatus === 'READY_TO_FINISH';
  const loading = (lotStatus === 'SAMPLING' || lotStatus === 'FINISHING');
  return (
    <ActionButton
      label={lotStatus === 'READY_TO_FINISH' ? 'Analyze Core Sample' : 'New Core Sample'}
      flags={{
        attention: attention || undefined,
        loading: loading || undefined
      }}
      icon={<CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;