import { useCallback, useContext, useMemo } from 'react';
import { Building } from '@influenceth/sdk';

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
  const [currentConstructionAction, constructionStatus, isAtRisk, deconstructTx, stageByActivity] = useMemo(() => {
    let current = {
      _crewmates: null,
      buildingId: null,
      buildingType: null,
      finishTime: null,
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
    let deconstructTx;
    if (lot?.building) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ConstructionStart'
        && item.assets.asteroid?.i === asteroidId
        && item.assets.lot?.i === lotId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew.crewmates;
        current.startTime = actionItem.startTime;
      }
      current.buildingId = lot.building.i;
      current.buildingType = lot.building.Building.buildingType;
      current.finishTime = lot.building.Building.finishTime;
      current.crewId = lot.building.Control.controller.id;

      if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
        if (getStatus('START_CONSTRUCTION', payload) === 'pending') {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.STARTING;
        } else if (getStatus('UNPLAN_CONSTRUCTION', payload) === 'pending') {
          status = 'CANCELING';
          stages.unplan = actionStage.COMPLETING;
        } else if (lot.building.Building.plannedAt + Building.GRACE_PERIOD >= liveBlockTime) {
          status = 'PLANNED';
          stages.plan = actionStage.COMPLETED;
        } else {
          isAtRisk = true;

          // if at-risk is being rebuilt on, check transaction to see if a new occupier is re-planning
          const planTx = getPendingTx('PLAN_CONSTRUCTION', payload);
          if (planTx) {
            current.buildingType = planTx.vars.buildingType;
            current.crewId = planTx.vars.crewId;
            current.finishTime = null;
            current.startTime = null;
            status = 'PLANNING';
            stages.plan = actionStage.COMPLETING;

          // if at risk, but i was the occupier, still treat as "planned" (will go back to "ready to plan" for other crews)
          } else if (lot.building?.Control?.controller?.id === crew?.i) {
            status = 'PLANNED';
            stages.plan = actionStage.COMPLETED;
          }
        }

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
        if (getStatus('FINISH_CONSTRUCTION', payload) === 'pending') {
          status = 'FINISHING';
          stages.construct = actionStage.COMPLETING;
        } else if (lot.building.Building.finishTime && (lot.building.Building.finishTime <= liveBlockTime)) {
          status = 'READY_TO_FINISH';
          stages.construct = actionStage.READY_TO_COMPLETE;
        } else {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.IN_PROGRESS;
        }

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
        if (getStatus('DECONSTRUCT', payload) === 'pending') {
          status = 'DECONSTRUCTING';
          deconstructTx = getPendingTx('DECONSTRUCT', payload);
          stages.deconstruct = actionStage.STARTING;
        } else {
          status = 'OPERATIONAL';
          stages.construct = actionStage.COMPLETED;
        }
      }
    } else {
      const planTx = getPendingTx('PLAN_CONSTRUCTION', payload);
      if (planTx) {
        current.buildingType = planTx.vars.buildingType;
        current.crewId = planTx.vars.crewId;
        status = 'PLANNING';
        stages.plan = actionStage.COMPLETING;
      }
    }

    return [
      status === 'READY_TO_PLAN' ? null : current,
      status,
      isAtRisk,
      deconstructTx,
      stages
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, lot?.building]);

  const planConstruction = useCallback((buildingType) => {
    execute(
      'PLAN_CONSTRUCTION',
      {
        buildingType,
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
    currentConstructionAction,
    deconstructTx,
    isAtRisk,
    stageByActivity
  };
};

export default useConstructionManager;
