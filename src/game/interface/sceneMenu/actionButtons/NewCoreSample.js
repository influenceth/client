import { useCallback } from 'react';

import { CoreSampleIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const NewCoreSample = ({ onSetAction }) => {
  const sampling = false;
  const handleClick = useCallback(() => {
    onSetAction('NEW_CORE_SAMPLE');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'New Core Sample'}
      flags={{
        loading: sampling || undefined
      }}
      icon={<CoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default NewCoreSample;