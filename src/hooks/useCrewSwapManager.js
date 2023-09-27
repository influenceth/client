import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import actionStages from '~/lib/actionStages';

const useCrewSwapManager = (props) => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);

  const reorderRoster = useCallback(({ crewId, newRoster }) => {
    execute('ArrangeCrew', {
      composition: newRoster,
      caller_crew: { id: crewId, label: Entity.IDS.CREW },
    })
  }, []);

  const swapCrewmates = useCallback(({ crewId1, newRoster1, crewId2, newRoster2 }) => {
    execute('ExchangeCrew', {
      crew1: { id: crewId1, label: Entity.IDS.CREW },
      comp1: newRoster1,
      _crew2: { id: crewId2, label: Entity.IDS.CREW },
      comp2: newRoster2
    })
  }, []);

  const getPendingChange = useCallback(
    () => {
      return getPendingTx('ArrangeCrew', {}) || getPendingTx('ExchangeCrew', {});
    },
    [getPendingTx]
  );

  const actionStage = useMemo(() => {
    return getPendingChange() ? actionStages.COMPLETING : actionStages.NOT_STARTED
  }, [getPendingChange]);

  return {
    reorderRoster,
    swapCrewmates,
    getPendingChange,
    actionStage
  };
};

export default useCrewSwapManager;
