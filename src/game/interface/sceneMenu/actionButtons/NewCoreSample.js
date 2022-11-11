import { useCallback } from 'react';

import { CoreSampleIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const NewCoreSample = ({ plot }) => {
  const sampling = false;
  const handleClick = useCallback(() => {
    console.log('not yet supported');
  }, [plot]);

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