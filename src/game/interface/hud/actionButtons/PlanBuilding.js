import { useCallback } from 'react';
import { Lot } from '@influenceth/sdk';

import { PlanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY_TO_PLAN: 'Plan Building Site',
  PLANNING: 'Planning Site...'
};

const PlanBuilding = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = constructionStatus === 'READY_TO_PLAN' && !crew?._ready ? 'crew is busy' : null;

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || undefined,
        loading: constructionStatus === 'PLANNING' || undefined
      }}
      icon={<PlanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default PlanBuilding;