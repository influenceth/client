import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Improve Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Sample',
  FINISHING: 'Analyzing...'
};

const ImproveCoreSample = ({ onSetAction, asteroid, plot }) => {
  const resourceMap = useStore(s => s.asteroids.showResourceMap);
  const { lotStatus } = useCoreSampleManager(asteroid?.i, plot?.i, resourceMap?.i, true);
  const handleClick = useCallback(() => {
    onSetAction('IMPROVE_CORE_SAMPLE');
  }, [onSetAction]);

  // badge shows full count of *improveable* core samples of *selected* resource on lot (owned by anyone)
  const improvableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => {
    return c.resourceId === Number(resourceMap?.i) && c.initialYield > 0 && c.status !== CoreSample.STATUS_USED;
  }), [plot?.coreSamples]);

  const attention = lotStatus === 'READY_TO_FINISH';
  const loading = (lotStatus === 'SAMPLING' || lotStatus === 'FINISHING');
  return (
    <ActionButton
      label={labelDict[lotStatus] || undefined}
      flags={{
        attention: attention || undefined,
        badge: improvableSamples?.length,
        loading: loading || undefined
      }}
      icon={<ImproveCoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default ImproveCoreSample;