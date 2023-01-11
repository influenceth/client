import { useCallback } from 'react';
import { Inventory } from '@influenceth/sdk';

import { CoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const NewCoreSample = ({ asteroid, plot, onSetAction }) => {
  const resourceMap = useStore(s => s.asteroids.showResourceMap);
  const { currentSample, samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE', { resourceId: resourceMap?.i });
  }, [onSetAction, resourceMap?.i]);

  let label = 'New Core Sample';
  let attention = undefined;
  let disabled = undefined;
  let loading = undefined;
  if (currentSample) {
    // if current sample applies to this button ("new" and matching resource id)
    if (currentSample.isNew && currentSample.resourceId === Number(resourceMap?.i)) {
      if (samplingStatus === 'READY_TO_FINISH') {
        label = 'Analyze Core Sample';
        attention = true;
      }
    
    // else, disable button (can still note which other resource)
    } else {
      disabled = true;
      if (currentSample.resourceId !==  Number(resourceMap?.i)) {
        label = samplingStatus === 'READY_TO_FINISH' ? 'Core Sample Ready' : 'Already Sampling';
        label += ` (${Inventory.RESOURCES[currentSample.resourceId].name})`;
      }
    }

    // can still show as "loading" whether this resource or others (as long as "new" sample)
    if (currentSample.isNew) {
      loading = (samplingStatus === 'SAMPLING' || samplingStatus === 'FINISHING');
    }
  }
  return (
    <ActionButton
      label={label}
      flags={{
        attention: attention || undefined,
        disabled,
        loading: loading || undefined
      }}
      icon={<CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;