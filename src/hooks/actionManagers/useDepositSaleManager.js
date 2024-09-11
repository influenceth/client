import { useCallback, useContext, useMemo } from '~/lib/react-debug';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const useDepositSaleManager = (deposit) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const payload = useMemo(import.meta.url, () => ({
    deposit: { id: deposit?.id, label: deposit?.label },
    caller_crew: { id: crew?.id, label: crew?.label },
  }), [crew, deposit]);

  const meta = useMemo(import.meta.url, () => ({
    deposit
  }), [deposit]);

  const purchaseListing = useCallback(import.meta.url, () => {
    execute(
      'PurchaseDeposit',
      payload,
      meta
    )
  }, [execute, meta, payload]);

  const updateListing = useCallback(import.meta.url, 
    (price) => {
      if (price > 0) {
        execute(
          'ListDepositForSale',
          { ...payload, price: price * 1e6 },
          meta
        )
      } else {
        execute(
          'UnlistDepositForSale',
          payload,
          meta
        )
      }
    },
    [execute, meta, payload]
  );

  const isPendingPurchase = useMemo(import.meta.url, () => getStatus('PurchaseDeposit', payload) === 'pending', [getStatus, payload]);
  const isPendingUpdate = useMemo(import.meta.url, () => (
    getStatus('ListDepositForSale', payload) === 'pending'
    || getStatus('UnlistDepositForSale', payload) === 'pending'
  ), [getStatus, payload]);

  return {
    isPendingPurchase,
    isPendingUpdate,
    purchaseListing,
    updateListing,
  };
};

export default useDepositSaleManager;
