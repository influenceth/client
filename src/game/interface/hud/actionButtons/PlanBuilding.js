import { useCallback, useMemo, useState } from 'react';
import { Permission } from '@influenceth/sdk';

import { PlanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';

const labelDict = {
  READY_TO_PLAN: 'Create Building Site',
  PLANNING: 'Creating Site...'
};

const isVisible = ({ constructionStatus, crew, lot, ship }) => {
  if (lot?.building?.Building?.status > 0) return false;
  return crew && lot && !ship && (
    constructionStatus === 'READY_TO_PLAN' || (
      lot?.building?.Control?.controller?.id === crew.id
      && constructionStatus === 'PLANNING'
    )
  );
};

const PlanBuilding = ({ asteroid, blockTime, crew, lot, onSetAction, simulation, simulationActions, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const setCoachmarkRef = useCoachmarkRefSetter();
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    const isControlledByMe = crew && lot && Permission.isPermitted(crew, Permission.IDS.USE_LOT, lot, blockTime);

    if (_disabled) return 'loading...';
    if (constructionStatus === 'READY_TO_PLAN') {
      return getCrewDisabledReason({
        asteroid,
        crew,
        isAllowedInSimulation: simulationActions.includes('PlanBuilding'),
        requireReady: !isControlledByMe
      });
    }
  }, [_disabled, asteroid, blockTime, constructionStatus, crew, lot, simulationActions]);

  return (
    <ActionButton
      ref={setCoachmarkRef(COACHMARK_IDS.actionButtonPlan)}
      label={labelDict[constructionStatus] || undefined}
      labelAddendum={disabledReason}
      flags={{
        attention: simulation && !disabledReason,
        disabled: disabledReason,
        loading: constructionStatus === 'PLANNING'
      }}
      icon={<PlanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default { Component: PlanBuilding, isVisible };
