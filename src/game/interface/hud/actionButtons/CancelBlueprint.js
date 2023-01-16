import { useCallback } from 'react';

import { CancelBlueprintIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  PLANNED: 'Cancel Blueprint',
  CANCELING: 'Canceling...'
};

const CancelBlueprint = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('CANCEL_BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        loading: constructionStatus === 'CANCELING' || undefined
      }}
      icon={<CancelBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default CancelBlueprint;