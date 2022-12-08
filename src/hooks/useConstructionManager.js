import { useCallback, useContext, useMemo } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';

const useConstructionManager = (asteroidId, plotId) => {
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({ asteroidId, plotId, crewId: crew?.i }), [asteroidId, plotId, crew?.i]);

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
  }, []);

  const startConstruction = useCallback(() => {
    execute('START_CONSTRUCTION', payload)
  }, []);

  const finishConstruction = useCallback(() => {
    execute('FINISH_CONSTRUCTION', payload)
  }, []);

  const deconstruct = useCallback(() => {
    execute('DECONSTRUCT', payload)
  }, []);

  // status flow
  // NONE > PLANNING > PLANNED > UNDER_CONSTRUCTION > READY_TO_FINISH > FINISHING > OPERATIONAL
  //      < CANCELING <                                                        < DECONSTRUCTING
  const constructionStatus = useMemo(() => {
    if (plot?.building) {
      if (plot.building.constructionStatus === Construction.STATUS_PLANNED) {
        if (getStatus('START_CONSTRUCTION', payload) === 'pending') {
          return 'UNDER_CONSTRUCTION';
        } else if (getStatus('CANCELING', payload) === 'pending') {
          return 'CANCELING';
        }
        return 'PLANNED';

      } else if (plot.building.constructionStatus === Construction.STATUS_UNDER_CONSTRUCTION) {
        if (getStatus('FINISH_CONSTRUCTION', payload) === 'pending') {
          return 'FINISHING';
        } else if (true) {
          return 'READY_TO_FINISH';
        }
        return 'UNDER_CONSTRUCTION';
      } else if (plot.building.constructionStatus === Construction.STATUS_OPERATIONAL) {
        if (getStatus('DECONSTRUCT', payload) === 'pending') {
          return 'DECONSTRUCTING';
        }
        return 'OPERATIONAL';
      }
    }
    const planStatus = getStatus('PLAN_CONSTRUCTION', payload);
    console.log(planStatus, payload);
    if (planStatus === 'pending') {
      return 'PLANNING';
    }
    return 'READY_TO_PLAN';
  }, [plot?.building?.constructionStatus, getStatus, payload]);


  return {
    planConstruction,
    unplanConstruction,
    startConstruction,
    finishConstruction,
    deconstruct,
    constructionStatus,
  };
};

export default useConstructionManager;
