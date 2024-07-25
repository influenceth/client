import { useCallback, useMemo, useState } from 'react';
import { Permission } from '@influenceth/sdk';

import { PlanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import Coachmarks, { COACHMARK_IDS } from '~/Coachmarks';

const labelDict = {
  READY_TO_PLAN: 'Create Building Site',
  PLANNING: 'Creating Site...'
};

const isVisible = ({ constructionStatus, crew, lot, ship }) => {
  return crew && lot && !ship && (
    constructionStatus === 'READY_TO_PLAN' || (
      lot?.building?.Control?.controller?.id === crew.id
      && constructionStatus === 'PLANNING'
    )
  );
};

const PlanBuilding = ({ asteroid, crew, lot, onSetAction, simulation, simulationActions, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('PLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    const isControlledByMe = crew && lot && Permission.isPermitted(crew, Permission.IDS.USE_LOT, lot);

    if (_disabled) return 'loading...';
    if (constructionStatus === 'READY_TO_PLAN') {
      return getCrewDisabledReason({
        asteroid,
        crew,
        isAllowedInSimulation: simulationActions.includes('PlanBuilding'),
        requireReady: !isControlledByMe
      });
    }
  }, [_disabled, asteroid, constructionStatus, crew, lot, simulationActions]);
  
  const [refEl, setRefEl] = useState();
  return (
    <>
      <ActionButton
        ref={setRefEl}
        label={labelDict[constructionStatus] || undefined}
        labelAddendum={disabledReason}
        flags={{
          attention: simulation && !disabledReason,
          disabled: disabledReason,
          loading: constructionStatus === 'PLANNING'
        }}
        icon={<PlanBuildingIcon />}
        onClick={handleClick} />
      <Coachmarks label={COACHMARK_IDS.actionButtonPlan} refEl={refEl} />
    </>
  );
};

export default { Component: PlanBuilding, isVisible };
