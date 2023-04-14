import { useCallback, useContext, useMemo } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from './useCrewContext';
import useLot from './useLot';
import useActionItems from './useActionItems';
import actionStage from '~/lib/actionStages';

const useConstructionManager = (asteroidId, lotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(asteroidId, lotId);

  const payload = useMemo(() => ({
    asteroidId,
    lotId,
    crewId: crew?.i
  }), [asteroidId, lotId, crew?.i]);

  // READY_TO_PLAN > PLANNING  > PLANNED > UNDER_CONSTRUCTION > READY_TO_FINISH > FINISHING > OPERATIONAL
  //               < CANCELING <         <                  DECONSTRUCTING                  <
  const [currentConstruction, constructionStatus, isAtRisk, stageByActivity] = useMemo(() => {
    let current = {
      _crewmates: null,
      capableId: null,
      capableType: null,
      completionTime: null,
      crewId: null,
      startTime: null
    };
    const stages = {
      plan: actionStage.NOT_STARTED,
      unplan: actionStage.NOT_STARTED,
      construct: actionStage.NOT_STARTED,
      deconstruct: actionStage.NOT_STARTED,
    };

    let status = 'READY_TO_PLAN';
    let isAtRisk = false;
    if (lot?.building) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ConstructionStart'
        && item.assets.asteroid?.i === asteroidId
        && item.assets.lot?.i === lotId
      ));
      if (actionItem) current._crewmates = actionItem.assets.crew.crewmates;
      current.capableId = lot.building.i;
      current.capableType = lot.building.capableType;
      current.completionTime = lot.building.construction?.completionTime;
      current.crewId = lot.occupier;
      current.startTime = lot.building.construction?.startTime;

      if (lot.building.construction?.status === Construction.STATUS_PLANNED) {
        if (getStatus('START_CONSTRUCTION', payload) === 'pending') {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.STARTING;
        } else if (getStatus('UNPLAN_CONSTRUCTION', payload) === 'pending') {
          status = 'CANCELING';
          stages.unplan = actionStage.COMPLETING;
        } else if (lot.gracePeriodEnd >= liveBlockTime) {
          status = 'PLANNED';
          stages.plan = actionStage.COMPLETED;
        } else {
          isAtRisk = true;

          // if at-risk is being rebuilt on, check transaction to see if a new occupier is re-planning
          const planTx = getPendingTx('PLAN_CONSTRUCTION', payload);
          if (planTx) {
            current.capableType = planTx.vars.capableType;
            current.crewId = planTx.vars.crewId;
            current.completionTime = null;
            current.startTime = null;
            status = 'PLANNING';
            stages.plan = actionStage.COMPLETING;

          // if at risk, but i was the occupier, still treat as "planned" (will go back to "ready to plan" for other crews)
          } else if (lot.occupier === crew?.i) {
            status = 'PLANNED';
            stages.plan = actionStage.COMPLETED;
          }
        }

      } else if (lot.building.construction?.status === Construction.STATUS_UNDER_CONSTRUCTION) {
        if (getStatus('FINISH_CONSTRUCTION', payload) === 'pending') {
          status = 'FINISHING';
          stages.construct = actionStage.COMPLETING;
        } else if (lot.building.construction?.completionTime && (lot.building.construction.completionTime <= liveBlockTime)) {
          status = 'READY_TO_FINISH';
          stages.construct = actionStage.READY_TO_COMPLETE;
        } else {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.IN_PROGRESS;
        }

      } else if (lot.building.construction?.status === Construction.STATUS_OPERATIONAL) {
        if (getStatus('DECONSTRUCT', payload) === 'pending') {
          status = 'DECONSTRUCTING';
          stages.deconstruct = actionStage.IN_PROGRESS;
        } else {
          status = 'OPERATIONAL';
          stages.construct = actionStage.COMPLETED;
        }
      }
    } else {
      const planTx = getPendingTx('PLAN_CONSTRUCTION', payload);
      if (planTx) {
        current.capableType = planTx.vars.capableType;
        current.crewId = planTx.vars.crewId;
        status = 'PLANNING';
        stages.plan = actionStage.COMPLETING;
      }
    }

    return [
      status === 'READY_TO_PLAN' ? null : current,
      status,
      isAtRisk,
      stages
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, lot?.building]);

  const planConstruction = useCallback((capableType) => {
    execute(
      'PLAN_CONSTRUCTION',
      {
        capableType,
        ...payload
      }
    )
  }, [payload]);

  const unplanConstruction = useCallback(() => {
    execute('UNPLAN_CONSTRUCTION', payload)
  }, [payload]);

  const startConstruction = useCallback(() => {
    execute('START_CONSTRUCTION', payload)
  }, [payload]);

  const finishConstruction = useCallback(() => {
    execute('FINISH_CONSTRUCTION', payload)
  }, [payload]);

  const deconstruct = useCallback(() => {
    execute('DECONSTRUCT', payload)
  }, [payload]);

  return {
    planConstruction,
    unplanConstruction,
    startConstruction,
    finishConstruction,
    deconstruct,
    constructionStatus,
    currentConstruction,
    isAtRisk,
    stageByActivity
  };
};

export default useConstructionManager;
