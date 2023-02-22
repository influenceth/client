import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from './useCrewContext';

const useCrewManager = () => {
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { crewMemberMap } = useCrewContext();

  const crewCredits = useMemo(() => {
    return Object.values(crewMemberMap || {}).filter((c) => !c.crewClass);
  }, [crewMemberMap]);

  const changeActiveCrew = useCallback(
    (params) => execute('SET_ACTIVE_CREW', params),
    [execute]
  );
  const getPendingActiveCrewChange = useCallback(
    (params) => getPendingTx('SET_ACTIVE_CREW', params),
    [getPendingTx]
  );

  const purchaseAndOrInitializeCrew = useCallback(
    (params) => {
      if (crewCredits.length > 0) {
        execute('INITIALIZE_CREWMATE', { i: crewCredits[0].i, ...params });
      } else {
        execute('PURCHASE_AND_INITIALIZE_CREWMATE', params);
      }
    },
    [crewCredits, execute]
  );

  const getPendingCrewmate = useCallback(
    () => {
      if (crewCredits.length > 0) {
        return getPendingTx('INITIALIZE_CREWMATE', { i: crewCredits[0].i });
      } else {
        return getPendingTx('PURCHASE_AND_INITIALIZE_CREWMATE', {});
      }
    },
    [crewCredits, getPendingTx]
  );

  return {
    changeActiveCrew,
    getPendingActiveCrewChange,
    purchaseAndOrInitializeCrew,
    getPendingCrewmate,
    crewCredits,
  };
};

export default useCrewManager;
