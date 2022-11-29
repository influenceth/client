import { useCallback } from 'react';

import { ImproveCoreSampleIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const ImproveCoreSample = ({ onSetAction, plot }) => {
  const improving = false;
  const handleClick = useCallback(() => {
    onSetAction('IMPROVE_CORE_SAMPLE');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Improve Core Sample'}
      flags={{
        loading: improving || undefined,
        badge: plot.coreSamplesExist
      }}
      icon={<ImproveCoreSampleIcon />}
      onClick={handleClick} />
  );
};

export default ImproveCoreSample;