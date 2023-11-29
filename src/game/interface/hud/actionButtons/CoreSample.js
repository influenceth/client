import { useCallback, useMemo } from 'react';
import { Asteroid, Lot, Product } from '@influenceth/sdk';

import { NewCoreSampleIcon, ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Start Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Sample',
  FINISHING: 'Analyzing...'
};

const NewCoreSample = ({ asteroid, lot, onSetAction, overrideResourceId, improveSample, _disabled }) => {
  const defaultResourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);
  const { currentSamplingAction: actualCurrentSample, samplingStatus: actualSamplingStatus } = useCoreSampleManager(lot?.id);

  const resourceId = overrideResourceId || defaultResourceId;

  let currentSamplingAction = actualCurrentSample;
  let samplingStatus = actualSamplingStatus;
  if (improveSample && (currentSamplingAction?.sampleId !== improveSample.sampleId || currentSamplingAction?.isNew)) {
    currentSamplingAction = null;
    samplingStatus = 'READY';
  }

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.Celestial?.abundanceSeed || !asteroid.Celestial?.abundances) return 0;
    return Asteroid.Entity.getAbundanceAtLot(asteroid, Lot.toIndex(lot.id), resourceId);
  }, [asteroid, lot, resourceId]);

  let label = labelDict[samplingStatus];
  let attention = undefined;
  let disabled = _disabled || undefined;
  let loading = undefined;

  // if there is a current sample ongoing
  if (currentSamplingAction) {
    // if it's ready to finish, show in "attention" mode (else, loading if loading)
    if (samplingStatus === 'READY_TO_FINISH') {
      attention = true;
    } else if (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING') {
      loading = true;
    }

    // always append which resource it is if not the selected one
    if (currentSamplingAction.resourceId !== resourceId) {
      label += ` (${Product.TYPES[currentSamplingAction.resourceId]?.name})`;
    }
    
  // else if there is not at current sample, if it is ready...
  } else if (samplingStatus === 'READY') {
    if (improveSample) {
      label = 'Improve Core Sample';
    }
    else if (lotAbundance > 0) {
      label += ` (${formatFixed(100 * lotAbundance, 1)}%)`;
    }
  }

  const handleClick = useCallback(() => {
    if (currentSamplingAction && !currentSamplingAction.isNew) {
      onSetAction('IMPROVE_CORE_SAMPLE');
    } else if (improveSample) {
      onSetAction('IMPROVE_CORE_SAMPLE', { preselect: { ...improveSample } });
    } else {
      onSetAction('NEW_CORE_SAMPLE', resourceId ? { preselect: { resourceId } } : undefined);
    }
  }, [currentSamplingAction, improveSample, onSetAction, resourceId]);

  const isImprovement = improveSample || (currentSamplingAction && !currentSamplingAction.isNew);
  return (
    <ActionButton
      label={label}
      flags={{
        attention: attention || undefined,
        disabled,
        loading: loading || undefined,
        finishTime: currentSamplingAction?.finishTime
      }}
      icon={isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;