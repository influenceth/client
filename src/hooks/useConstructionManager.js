import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';

const useConstructionManager = (asteroidId, plotId) => {
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const committedTimeout = useRef();
  const [shouldBeCommitted, setShouldBeCommitted] = useState();
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

  useEffect(() => {
    const now = getAdjustedNow();
    if (plot?.building?.committedTime > now) {
      committedTimeout.current = setTimeout(() => {
        setShouldBeCommitted(true);
      }, (plot?.building?.committedTime - now) * 1000);
    } else {
      setShouldBeCommitted(true);
    }
    return () => {
      if (committedTimeout.current) clearTimeout(committedTimeout.current);
    }
  }, [plot?.building?.committedTime]);

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
    console.log(planStatus, payload);
    if (planStatus === 'pending') {
      return 'PLANNING';
    }
    return 'READY_TO_PLAN';
  }, [plot?.building?.constructionStatus, getStatus, payload, shouldBeCommitted]);


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
