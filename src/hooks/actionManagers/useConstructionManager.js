import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Asteroid, Building, Entity, Lot } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useBlockTime from '~/hooks/useBlockTime';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useAsteroid from '~/hooks/useAsteroid';
import actionStage from '~/lib/actionStages';

const useConstructionManager = (lotId) => {
  const { actionItems, readyItems } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const blockTime = useBlockTime();
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const asteroidId = useMemo(import.meta.url, () => Lot.toPosition(lotId)?.asteroidId, [lotId]);
  const { data: asteroid } = useAsteroid(asteroidId);
  const buildingId = lot?.building?.id;

  const planPayload = useMemo(import.meta.url, () => ({
    lot: { id: lotId, label: Entity.IDS.LOT },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lotId, crew?.id]);

  const payload = useMemo(import.meta.url, () => ({
    building: { id: buildingId, label: Entity.IDS.BUILDING },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [buildingId, crew?.id]);

  // UNBUILDABLE (before asteroid is scanned)
  // READY_TO_PLAN > PLANNING  > PLANNED > UNDER_CONSTRUCTION > READY_TO_FINISH > FINISHING > OPERATIONAL
  //               < CANCELING <         <                  DECONSTRUCTING                  <
  const [currentConstructionAction, constructionStatus, isAtRisk, stageByActivity] = useMemo(import.meta.url, () => {
    let current = {
      _cachedData: null,
      _isAccessible: true,
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

    let status = asteroid?.Celestial?.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED
      ? 'READY_TO_PLAN'
      : 'UNBUILDABLE';
    let isAtRisk = false;
    if (lot?.building) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'ConstructionStarted'
        && item.event.returnValues.building.id === lot.building.id
      ));

      if (actionItem) {
        current._cachedData = actionItem.data;
        current.startTime = actionItem._startTime || actionItem.event.timestamp;
      } else {
        current._isAccessible = false;
      }

      current.buildingId = lot.building.id;
      current.buildingType = lot.building.Building?.buildingType;
      current.finishTime = lot.building.Building?.finishTime;
      current.crewId = lot.building.Control?.controller?.id;

      if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
        if (getStatus('ConstructionStart', payload) === 'pending') {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = actionStage.STARTING;
        } else if (getStatus('ConstructionAbandon', payload) === 'pending') {
          status = 'CANCELING';
          stages.unplan = actionStage.COMPLETING;
        } else if (lot.building.Building.plannedAt + Building.GRACE_PERIOD >= blockTime) {
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

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
        if (getStatus('ConstructionFinish', payload) === 'pending') {
          status = 'FINISHING';
          stages.construct = actionStage.COMPLETING;
        } else if (lot.building.Building.finishTime && (lot.building.Building.finishTime <= blockTime)) {
          status = 'READY_TO_FINISH';
          stages.construct = actionStage.READY_TO_COMPLETE;
        } else {
          status = 'UNDER_CONSTRUCTION';
          stages.construct = current.startTime > blockTime ? actionStage.SCHEDULED : actionStage.IN_PROGRESS;
        }

      } else if (lot.building.Building.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
        if (getStatus('ConstructionDeconstruct', payload) === 'pending') {
          status = 'DECONSTRUCTING';
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
      stages
    ];
  }, [actionItems, asteroid, readyItems, getPendingTx, getStatus, payload, planPayload, lot?.building]);

  const txMeta = useMemo(import.meta.url, () => ({ asteroidId, lotId }), [asteroidId, lotId]);

  const planConstruction = useCallback(import.meta.url, (buildingType) => {
    execute(
      'ConstructionPlan',
      {
        building_type: buildingType,
        ...planPayload
      }
    )
  }, [planPayload]);

  const unplanConstruction = useCallback(import.meta.url, () => {
    execute(
      'ConstructionAbandon',
      payload,
      { ...txMeta, buildingType: lot?.building?.Building?.buildingType }
    )
  }, [payload]);

  const startConstruction = useCallback(import.meta.url, () => {
    execute('ConstructionStart', payload, txMeta)
  }, [payload]);

  const finishConstruction = useCallback(import.meta.url, () => {
    execute('ConstructionFinish', payload, txMeta)
  }, [payload]);

  const deconstruct = useCallback(import.meta.url, () => {
    execute(
      'ConstructionDeconstruct',
      payload,
      { ...txMeta, buildingType: lot?.building?.Building?.buildingType }
    )
  }, [payload]);

  return {
    planConstruction,
    unplanConstruction,
    startConstruction,
    finishConstruction,
    deconstruct,
    constructionStatus,
    currentConstructionAction,
    isAtRisk,
    stageByActivity
  };
};

export default useConstructionManager;
