import { useCallback, useContext, useMemo } from 'react';
import { Building, Entity, Lot } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useActionItems from '~/hooks/useActionItems';
import actionStage from '~/lib/actionStages';

const useConstructionManager = (lotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const asteroidId = useMemo(() => Lot.toPosition(lotId)?.asteroidId, [lotId]);
  const buildingId = lot?.building?.id;

  const planPayload = useMemo(() => ({
    lot: { id: lotId, label: Entity.IDS.LOT },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lotId, crew?.id]);

  const payload = useMemo(() => ({
    building: { id: buildingId, label: Entity.IDS.BUILDING },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [buildingId, crew?.id]);

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
        item.event.name === 'ConstructionStarted'
        && item.event.returnValues.building.id === lot.building.id
      ));

      if (actionItem) {
        // current._crewmates = actionItem.assets.crew.crewmates; // TODO: ...
        current.startTime = actionItem.event.timestamp;
      }

      current.buildingId = lot.building.id;
      current.buildingType = lot.building.Building?.buildingType;
      current.finishTime = lot.building.Building?.finishTime;
      current.crewId = lot.building.Control?.controller?.id;

      if (lot.building.Building.status === Building.CONSTRUCTION_STATUS_IDS.PLANNED) {
        if (getStatus('ConstructionStart', payload) === 'pending') {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.STARTING;
        } else if (getStatus('ConstructionAbandon', payload) === 'pending') {
          status = 'CANCELING';
          stages.unplan = actionStage.COMPLETING;
        } else if (lot.building.Building.plannedAt + Building.GRACE_PERIOD >= liveBlockTime) {
          status = 'PLANNED';
          stages.plan = actionStage.COMPLETED;
        } else {
          isAtRisk = true;

          // if at-risk is being rebuilt on, check transaction to see if a new occupier is re-planning
          const planTx = getPendingTx('ConstructionPlan', planPayload);
          if (planTx) {
            current.buildingType = planTx.vars.buildingType;
            current.crewId = planTx.vars.crewId;
            current.finishTime = null;
            current.startTime = null;
            status = 'PLANNING';
            stages.plan = actionStage.COMPLETING;

          // if at risk, but i was the occupier, still treat as "planned" (will go back to "ready to plan" for other crews)
          } else if (lot.building?.Control?.controller?.id === crew?.id) {
            status = 'PLANNED';
            stages.plan = actionStage.COMPLETED;
          }
        }

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUS_IDS.UNDER_CONSTRUCTION) {
        if (getStatus('ConstructionFinish', payload) === 'pending') {
          status = 'FINISHING';
          stages.construct = actionStage.COMPLETING;
        } else if (lot.building.Building.finishTime && (lot.building.Building.finishTime <= liveBlockTime)) {
          status = 'READY_TO_FINISH';
          stages.construct = actionStage.READY_TO_COMPLETE;
        } else {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.IN_PROGRESS;
        }

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUS_IDS.OPERATIONAL) {
        if (getStatus('ConstructionDeconstruct', payload) === 'pending') {
          status = 'DECONSTRUCTING';
          deconstructTx = getPendingTx('ConstructionDeconstruct', payload);
          stages.deconstruct = actionStage.STARTING;
        } else {
          status = 'OPERATIONAL';
          stages.construct = actionStage.COMPLETED;
        }
      }
    } else {
      const planTx = getPendingTx('ConstructionPlan', planPayload);
      if (planTx) {
        current.buildingType = planTx.vars.building_type;
        current.crewId = planTx.vars.caller_crew.id;
        status = 'PLANNING';
        stages.plan = actionStage.COMPLETING;
      }
    }

    return [
      current,
      status,
      isAtRisk,
      deconstructTx,
      stages
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, planPayload, lot?.building]);

  const txMeta = useMemo(() => ({ asteroidId, lotId }), [asteroidId, lotId]);

  const planConstruction = useCallback((buildingType) => {
    execute(
      'ConstructionPlan',
      {
        building_type: buildingType,
        ...planPayload
      }
    )
  }, [planPayload]);

  const unplanConstruction = useCallback(() => {
    execute(
      'ConstructionAbandon',
      payload,
      { ...txMeta, buildingType: lot?.building?.Building?.buildingType }
    )
  }, [payload]);

  const startConstruction = useCallback(() => {
    execute('ConstructionStart', payload, txMeta)
  }, [payload]);

  const finishConstruction = useCallback(() => {
    execute('ConstructionFinish', payload, txMeta)
  }, [payload]);

  const deconstruct = useCallback(() => {
    execute('ConstructionDeconstruct', payload, txMeta)
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
