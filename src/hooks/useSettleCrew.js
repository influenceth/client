import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useSettleCrew = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const settleCrew = useCallback(
    () => execute('SETTLE_CREW', { i }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('SETTLE_CREW', { i }),
    [getStatus, i]
  );

  return {
    settleCrew,
    settling: status === 'pending'
  };
};

export default useSettleCrew;
