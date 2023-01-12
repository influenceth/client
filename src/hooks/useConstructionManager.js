import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { capableTypeNameToId } from '~/lib/utils';
import useActionItems from './useActionItems';

const useConstructionManager = (asteroidId, plotId) => {
  const { actionItems, readyItems } = useActionItems();
  const { chainTime, execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({
    asteroidId,
    plotId,
    crewId: crew?.i
  }), [asteroidId, plotId, crew?.i]);

  // NONE > PLANNING > PLANNED > UNDER_CONSTRUCTION > READY_TO_FINISH > FINISHING > OPERATIONAL
  //      < CANCELING <  
  const [currentConstruction, constructionStatus] = useMemo(() => {
    let current = {
      _crewmates: null,
      capableId: null,
      capableType: null,
      completionTime: null,
      crewId: null,
      startTime: null
    };

    let status = 'READY_TO_PLAN';
    if (plot?.building) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ConstructionStart'
        && item.assets.asteroid?.i === asteroidId
        && item.assets.lot?.i === plotId
      ));
      if (actionItem) current._crewmates = actionItem.assets.crew.crewmates;
      current.capableId = plot.building.i;
      current.capableType = plot.building.capableType;
      current.completionTime = plot.building.construction?.completionTime;
      current.crewId = plot.occupier;
      current.startTime = plot.building.construction?.startTime;

      if (plot.building.construction?.status === Construction.STATUS_PLANNED) {
        if (getStatus('START_CONSTRUCTION', payload) === 'pending') {
          status = 'UNDER_CONSTRUCTION';
        } else if (getStatus('UNPLAN_CONSTRUCTION', payload) === 'pending') {
          status = 'CANCELING';
        } else {
          status = 'PLANNED';
        }

      } else if (plot.building.construction?.status === Construction.STATUS_UNDER_CONSTRUCTION) {
        if (getStatus('FINISH_CONSTRUCTION', payload) === 'pending') {
          status = 'FINISHING';
        } else if (plot.building.construction?.completionTime && (plot.building.construction.completionTime < chainTime)) {
          status = 'READY_TO_FINISH';
        } else {
          status = 'UNDER_CONSTRUCTION';
        }

      } else if (plot.building.construction?.status === Construction.STATUS_OPERATIONAL) {
        if (getStatus('DECONSTRUCT', payload) === 'pending') {
          status = 'DECONSTRUCTING';
        } else {
          status = 'OPERATIONAL';
        }
      }
    } else {
      const planTx = getPendingTx('PLAN_CONSTRUCTION', payload);
      if (planTx) {
        current.capableType = planTx.vars.capableType;
        current.crewId = planTx.vars.crewId;
        status = 'PLANNING';
      }
    }

    return [
      status === 'READY' ? null : current,
      status
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, plot?.building]);

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
    currentConstruction
  };
};

export default useConstructionManager;
