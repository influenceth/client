import { useCallback } from 'react';

import { LayBlueprintIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY_TO_PLAN: 'Plan Building Site',
  PLANNING: 'Planning Site...'
};

const NewBlueprint = ({ asteroid, plot, onSetAction }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        loading: constructionStatus === 'PLANNING' || undefined
      }}
      icon={<LayBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default NewBlueprint;