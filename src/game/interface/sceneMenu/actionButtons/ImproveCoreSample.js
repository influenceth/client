import { useCallback } from 'react';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const ImproveCoreSample = ({ plot }) => {
  const improving = false;
  const handleClick = useCallback(() => {
    console.log('not yet supported');
  }, [plot]);

  return (
    <ActionButton
      label={'Improve Core Sample'}
      flags={{
        loading: improving,
        badge: plot.coreSamplesExist
      }}
      icon={<ImproveCoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default ImproveCoreSample;