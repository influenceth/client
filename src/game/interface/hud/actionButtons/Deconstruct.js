import { useCallback } from 'react';

import { DeconstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  OPERATIONAL: 'Deconstruct Building',
  DECONSTRUCTING: 'Deconstructing...'
};

const Deconstruct = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        loading: constructionStatus === 'DECONSTRUCTING' || undefined
      }}
      icon={<DeconstructIcon />}
      onClick={handleClick} />
  );
};

export default Deconstruct;