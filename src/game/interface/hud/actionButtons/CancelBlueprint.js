import { useCallback } from 'react';

import { CancelBlueprintIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  PLANNED: 'Cancel Blueprint',
  CANCELING: 'Canceling...'
};

const CancelBlueprint = ({ asteroid, plot, onSetAction }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('CANCEL_BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        loading: constructionStatus === 'CANCELING' || undefined
      }}
      icon={<CancelBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default CancelBlueprint;