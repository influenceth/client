import { useCallback, useMemo } from 'react';
import { CoreSample, Inventory } from '@influenceth/sdk';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Improve Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Improved Sample',
  FINISHING: 'Analyzing...',

  OTHER_SAMPLE_READY: 'Sample Ready',
  OTHER_SAMPLE_SAMPLING: 'Sampling...'
};

const ImproveCoreSample = ({ onSetAction, asteroid, plot }) => {
  const resourceMap = useStore(s => s.asteroids.showResourceMap);
  const { currentSample, samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);
  const { crew } = useCrew();
  const handleClick = useCallback(() => {
    onSetAction('IMPROVE_CORE_SAMPLE');
  }, [onSetAction]);

  // badge shows full count of *improveable* core samples of *selected* resource on lot (owned by me)
  // TODO: this should ideally also check for pending use of samples (i.e. by extractor)
  // TODO (later): eventually, this should maybe be owned by anyone
  const improvableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => {
    return c.resourceId === Number(resourceMap?.i)
      && (!crew?.i || c.owner === crew?.i)
      && c.initialYield > 0
      && c.status !== CoreSample.STATUS_USED;
  }), [plot?.coreSamples, resourceMap?.i]);

  const badge = (!currentSample?.isNew && samplingStatus === 'READY_TO_FINISH')
    ? '✓'
    : (samplingStatus === 'READY' ? improvableSamples?.length : 0);

  let label = labelDict[samplingStatus];
  let attention = undefined;
  let disabled = undefined;
  let loading = undefined;
  if (currentSample) {
    // if current sample applies to this button ("improving" and matching resource id)
    if (!currentSample.isNew && currentSample.resourceId === Number(resourceMap?.i)) {
      if (samplingStatus === 'READY_TO_FINISH') {
        attention = true;
      }
    
    // else, disable button (can still note which other resource)
    } else {
      disabled = true;
      if (currentSample.resourceId !==  Number(resourceMap?.i)) {
        label = samplingStatus === 'READY_TO_FINISH' ? labelDict.OTHER_SAMPLE_READY : labelDict.OTHER_SAMPLE_SAMPLING;
        label += ` (${Inventory.RESOURCES[currentSample.resourceId].name})`;
      }
    }

    // can still show as "loading" whether this resource or others (as long as "improving" sample)
    if (!currentSample.isNew) {
      loading = (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING');
    }
  }

  if (!(improvableSamples.length > 0 || currentSample?.initialYield)) return null;
  return (
    <ActionButton
      label={label}
      flags={{
        attention: attention || undefined,
        badge,
        disabled,
        loading: loading || undefined
      }}
      icon={<ImproveCoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default ImproveCoreSample;