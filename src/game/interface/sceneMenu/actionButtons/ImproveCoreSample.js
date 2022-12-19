import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import ActionButton from './ActionButton';

const ImproveCoreSample = ({ onSetAction, asteroid, plot }) => {
  const { samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('IMPROVE_CORE_SAMPLE');
  }, [onSetAction]);

  // TODO: filter by resource id
  // badge shows full count of *improveable* core samples of *selected* resource on lot (owned by anyone)
  const improvableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => c.status === CoreSample.STATUS_FINISHED), [plot?.coreSamples]);

  // TODO: need to separate this from states on "new core sample" button
  // (potentially by hiding one or the other OR collapsing dialogs into single)
  const attention = samplingStatus === 'READY_TO_FINISH';
  const loading = samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING';
  return (
    <ActionButton
      label={samplingStatus === 'READY_TO_FINISH' ? 'Analyze Core Sample' : 'Improve Core Sample'}
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