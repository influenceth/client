import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useFinalizeAsteroidScan = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const finalizeAsteroidScan = useCallback(
    () => execute('FINALIZE_ASTEROID_SCAN', { i }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('FINALIZE_ASTEROID_SCAN', { i }),
    [getStatus, i]
  );

  return {
    finalizeAsteroidScan,
    finalizingScan: status === 'pending'
  };
};

export default useFinalizeAsteroidScan;
