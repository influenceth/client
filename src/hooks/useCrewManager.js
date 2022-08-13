import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useCrewManager = () => {
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);

  const getPurchasePrice = () => {
    // TODO: ...
  };

  const changeActiveCrew = useCallback(
    (params) => execute('SET_ACTIVE_CREW', params),
    [execute]
  );
  const getPendingActiveCrewChange = useCallback(
    (params) => getPendingTx('SET_ACTIVE_CREW', params),
    [getPendingTx]
  );

  const purchaseAndInitializeCrew = useCallback(
    (params) => execute('PURCHASE_AND_INITIALIZE_CREW', params),
    [execute]
  );
  const getPendingPurchase = useCallback(
    (sessionId) => getPendingTx('PURCHASE_AND_INITIALIZE_CREW', { sessionId }),
    [getPendingTx]
  );

  // TODO: 
  const initializeCrew = useCallback(
    (params) => execute('INITIALIZE_CREW', params),
    [execute]
  );
  const getInitializationStatus = useCallback(
    (i) => getStatus('INITIALIZE_CREW', { i }),
    [getStatus]
  );

  return {
    getPurchasePrice,
    changeActiveCrew,
    getPendingActiveCrewChange,
    purchaseAndInitializeCrew,
    getPendingPurchase,
    initializeCrew,
    getInitializationStatus,
  };
};

export default useCrewManager;
