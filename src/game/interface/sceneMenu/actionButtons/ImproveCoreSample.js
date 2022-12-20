import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const ImproveCoreSample = ({ onSetAction, asteroid, plot }) => {
  const resourceMap = useStore(s => s.asteroids.showResourceMap);
  const { lotStatus } = useCoreSampleManager(asteroid?.i, plot?.i, resourceMap?.i, true);
  const handleClick = useCallback(() => {
    onSetAction('IMPROVE_CORE_SAMPLE');
  }, [onSetAction]);

  // badge shows full count of *improveable* core samples of *selected* resource on lot (owned by anyone)
  const improvableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => {
    return c.resourceId === Number(resourceMap?.i) && c.status === CoreSample.STATUS_FINISHED;
  }), [plot?.coreSamples]);

  const attention = lotStatus === 'READY_TO_FINISH';
  const loading = (lotStatus === 'SAMPLING' || lotStatus === 'FINISHING');
  return (
    <ActionButton
      label={lotStatus === 'READY_TO_FINISH' ? 'Analyze Improved Sample' : 'Improve Core Sample'}
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