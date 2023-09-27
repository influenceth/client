import { useCallback } from 'react';

import { PlanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY_TO_PLAN: 'Plan Building Site',
  PLANNING: 'Planning Site...'
};

const PlanBuilding = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, lot?.i);
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        loading: constructionStatus === 'PLANNING' || undefined
      }}
      icon={<PlanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default PlanBuilding;