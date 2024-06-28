import { useCallback, useMemo } from 'react';
import { Lot, Permission } from '@influenceth/sdk';

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

const PlanBuilding = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    const isControlled = Permission.isPermitted(crew, Permission.IDS.USE_LOT, lot);

    // if controlled by *someone*, i am only permitted if it is controlled by me (else, i am permitted to squat)
    const isPermitted = (lot?.PrepaidAgreements?.length > 0 || lot?.ContractAgreements?.length > 0 ) ? isControlled : true;

    if (_disabled) return 'loading...';
    if (!isPermitted) return 'lot reserved';
    if (constructionStatus === 'READY_TO_PLAN') return getCrewDisabledReason({ asteroid, crew, requireReady: !isControlled });
  }, [_disabled, asteroid, constructionStatus, crew, lot]);

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
