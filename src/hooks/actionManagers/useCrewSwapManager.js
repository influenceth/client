import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';

const useCrewSwapManager = (props) => {
  const { crew } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);

  const reorderRoster = useCallback(import.meta.url, ({ crewId, newRoster }) => {
    execute('ArrangeCrew', {
      composition: newRoster,
      caller_crew: { id: crewId, label: Entity.IDS.CREW },
    })
  }, []);

  const swapCrewmates = useCallback(import.meta.url, ({ crewId1, newRoster1, crewId2, newRoster2 }) => {
    execute('ExchangeCrew', {
      crew1: { id: crewId1, label: Entity.IDS.CREW },
      comp1: newRoster1,
      _crew2: { id: crewId2, label: Entity.IDS.CREW },
      comp2: newRoster2
    })
  }, []);

  const getPendingChange = useCallback(import.meta.url, 
    () => {
      return getPendingTx('ArrangeCrew', { caller_crew: { id: crew?.id, label: Entity.IDS.CREW } })
        || getPendingTx('ExchangeCrew', {});
    },
    [crew?.id, getPendingTx]
  );

  const actionStage = useMemo(import.meta.url, () => {
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
