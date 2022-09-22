import { useCallback, useContext } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useCrewManager = () => {
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);

  const changeActiveCrew = useCallback(
    (params) => execute('SET_ACTIVE_CREW', params),
    [execute]
  );
  const getActiveCrewChangeStatus = useCallback(
    (params) => getStatus('SET_ACTIVE_CREW', params),
    [getStatus]
  );
  const getPendingActiveCrewChange = useCallback(
    (params) => getPendingTx('SET_ACTIVE_CREW', params),
    [getPendingTx]
  );

  const purchaseAndInitializeCrew = useCallback(
    (params) => execute('PURCHASE_AND_INITIALIZE_CREW', params),
    [execute]
  );
  const getPurchaseStatus = useCallback(
    (sessionId) => getStatus('PURCHASE_AND_INITIALIZE_CREW', { sessionId }),
    [getStatus]
  );
  const getPendingPurchase = useCallback(
    (sessionId) => getPendingTx('PURCHASE_AND_INITIALIZE_CREW', { sessionId }),
    [getPendingTx]
  );

  // TODO: implement / test these once crew credits / empty crew are implemented
  const initializeCrew = useCallback(
    (params) => execute('INITIALIZE_CREW', params),
    [execute]
  );
  const getInitializationStatus = useCallback(
    (i) => getStatus('INITIALIZE_CREW', { i }),
    [getStatus]
  );

  return {
    changeActiveCrew,
    getActiveCrewChangeStatus,
    getPendingActiveCrewChange,
    purchaseAndInitializeCrew,
    getPurchaseStatus,
    getPendingPurchase,
    initializeCrew,
    getInitializationStatus,
  };
};

export default useCrewManager;
