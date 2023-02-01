import { useCallback, useMemo } from 'react';
import { Asteroid, Inventory } from '@influenceth/sdk';

import { CoreSampleIcon, ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { formatFixed } from '~/lib/utils';

const labelDict = {
  READY: 'Start Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Sample',
  FINISHING: 'Analyzing...'
};

const NewCoreSample = ({ asteroid, plot, onSetAction, _disabled }) => {
  const resourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);
  const { currentSample, samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);

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
  let badge = 0;
  let disabled = _disabled = undefined;
  let loading = undefined;

  // if there is a current sample ongoing
  if (currentSample) {
    // if it's ready to finish, show in "attention" mode (else, loading if loading)
    if (samplingStatus === 'READY_TO_FINISH') {
      attention = true;
      badge = '✓';
    } else if (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING') {
      loading = true;
    }

    // always append which resource it is if not the selected one
    if (currentSample.resourceId !== resourceId) {
      label += ` (${Inventory.RESOURCES[currentSample.resourceId].name})`;
    }
    
  // else if there is not at current sample, if it is ready...
  } else if (samplingStatus === 'READY') {
    if (lotAbundance > 0) {
      label += ` (${formatFixed(100 * lotAbundance, 1)}%)`;
    }
  }

  // TODO: sometimes the improve dialog
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE', resourceId ? { resourceId } : undefined);
  }, [currentSample, onSetAction, resourceId]);

  // const badge = (currentSample?.isNew && samplingStatus === 'READY_TO_FINISH') ? '✓' : 0;
  // if (currentSample) {
  //   // if current sample applies to this button ("new" and matching resource id)
  //   if (currentSample.isNew && currentSample.resourceId === resourceId) {
  //     if (samplingStatus === 'READY_TO_FINISH') {
  //       attention = true;
  //     }

  //   // else, disable button (can still note which other resource)
  //   } else {
  //     disabled = true;
  //     if (currentSample.resourceId !==  resourceId) {
  //       label = samplingStatus === 'READY_TO_FINISH' ? labelDict.OTHER_SAMPLE_READY : labelDict.OTHER_SAMPLE_SAMPLING;
  //       label += ` (${Inventory.RESOURCES[currentSample.resourceId].name})`;
  //     }
  //   }

  //   // can still show as "loading" whether this resource or others (as long as "new" sample)
  //   if (currentSample.isNew) {
  //     loading = (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING');
  //   }
  // } else if (samplingStatus === 'READY') {
  //   label += ` (${formatFixed(100 * lotAbundance, 1)}%)`;
  // }

  const isImprovement = currentSample && !currentSample.isNew;
  return (
    <ActionButton
      label={label}
      flags={{
        attention: attention || undefined,
        badge,
        disabled,
        loading: loading || undefined
      }}
      icon={isImprovement ? <ImproveCoreSampleIcon /> : <CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;