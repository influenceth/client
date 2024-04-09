import { useCallback, useMemo } from 'react';
import { Lot } from '@influenceth/sdk';

import { PlanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  READY_TO_PLAN: 'Plan Building Site',
  PLANNING: 'Planning Site...'
};

const isVisible = ({ constructionStatus, crew, lot, ship }) => {
  return crew && lot && !ship && (
    constructionStatus === 'READY_TO_PLAN' || (
      lot?.building?.Control?.controller?.id === crew.id
      && constructionStatus === 'PLANNING'
    )
  );
};

const PlanBuilding = ({ accountAddress, asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (constructionStatus === 'READY_TO_PLAN') {
      return getCrewDisabledReason({ accountAddress, asteroid, crew });
    }
  }, [_disabled, accountAddress, asteroid, constructionStatus, crew]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: constructionStatus === 'PLANNING'
      }}
      icon={<PlanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default { Component: PlanBuilding, isVisible };
