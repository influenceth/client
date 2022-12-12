import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';
import useActionItems from './useActionItems';

const useConstructionManager = (asteroidId, plotId) => {
  const actionItems = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);
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

  // status flow
  // NONE > PLANNING > PLANNED > UNDER_CONSTRUCTION > READY_TO_FINISH > FINISHING > OPERATIONAL
  //      < CANCELING <                                                        < DECONSTRUCTING
  const constructionStatus = useMemo(() => {
    if (plot?.building) {
      if (plot.building.constructionStatus === Construction.STATUS_PLANNED) {
        if (getStatus('START_CONSTRUCTION', payload) === 'pending') {
          return 'UNDER_CONSTRUCTION';
        } else if (getStatus('UNPLAN_CONSTRUCTION', payload) === 'pending') {
          return 'CANCELING';
        }
        return 'PLANNED';

      } else if (plot.building.constructionStatus === Construction.STATUS_UNDER_CONSTRUCTION) {
        if (getStatus('FINISH_CONSTRUCTION', payload) === 'pending') {
          return 'FINISHING';
        } else if (plot.building.committedTime && (plot.building.committedTime < getAdjustedNow())) {
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
    if (planStatus === 'pending') {
      return 'PLANNING';
    }
    return 'READY_TO_PLAN';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [plot?.building?.constructionStatus, getStatus, payload, actionItems]);


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
