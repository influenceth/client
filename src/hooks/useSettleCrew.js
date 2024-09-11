import { useCallback, useContext, useMemo } from '~/lib/react-debug';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useSettleCrew = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const settleCrew = useCallback(import.meta.url, 
    () => execute('SETTLE_CREW', { i }),
    [execute, i]
  );

  const status = useMemo(import.meta.url, 
    () => getStatus('SETTLE_CREW', { i }),
    [getStatus, i]
  );

  return {
    settleCrew,
    settling: status === 'pending'
  };
};

export default useSettleCrew;
