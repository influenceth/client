import { useCallback, useMemo } from 'react';
import { Asteroid, Inventory } from '@influenceth/sdk';

import { CoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { formatFixed } from '~/lib/utils';

const labelDict = {
  READY: 'Start Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Sample',
  FINISHING: 'Analyzing...',

  OTHER_SAMPLE_READY: 'Sample Ready',
  OTHER_SAMPLE_SAMPLING: 'Sampling...'
};

const NewCoreSample = ({ asteroid, plot, onSetAction, _disabled }) => {
  const resourceId = useStore(s => s.asteroids.mapResourceId);
  const { currentSample, samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE', { resourceId: resourceId });
  }, [onSetAction, resourceId]);

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.resourceSeed || !asteroid.resources) return 0;
    return Asteroid.getAbundanceAtLot(
      asteroid?.i,
      BigInt(asteroid?.resourceSeed),
      Number(plot?.i),
      resourceId,
      asteroid.resources[resourceId]
    );
  }, [asteroid, plot, resourceId]);

  let label = labelDict[samplingStatus];
  let attention = undefined;
  let disabled = _disabled || !(lotAbundance > 0) || undefined;
  let loading = undefined;
  const badge = (currentSample?.isNew && samplingStatus === 'READY_TO_FINISH') ? '✓' : 0;
  if (currentSample) {
    // if current sample applies to this button ("new" and matching resource id)
    if (currentSample.isNew && currentSample.resourceId === resourceId) {
      if (samplingStatus === 'READY_TO_FINISH') {
        attention = true;
      }
    
    // else, disable button (can still note which other resource)
    } else {
      disabled = true;
      if (currentSample.resourceId !==  resourceId) {
        label = samplingStatus === 'READY_TO_FINISH' ? labelDict.OTHER_SAMPLE_READY : labelDict.OTHER_SAMPLE_SAMPLING;
        label += ` (${Inventory.RESOURCES[currentSample.resourceId].name})`;
      }
    }

    // can still show as "loading" whether this resource or others (as long as "new" sample)
    if (currentSample.isNew) {
      loading = (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING');
    }
  } else if (samplingStatus === 'READY') {
    label += ` (${formatFixed(100 * lotAbundance, 1)}%)`;
  }

  return (
    <ActionButton
      label={label}
      flags={{
        attention: attention || undefined,
        badge,
        disabled,
        loading: loading || undefined
      }}
      icon={<CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;