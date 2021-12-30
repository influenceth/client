import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useStartAsteroidScan = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const startAsteroidScan = useCallback(
    () => execute('START_ASTEROID_SCAN', { i }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('START_ASTEROID_SCAN', { i }),
    [getStatus, i]
  );

  return {
    startAsteroidScan,
    startingScan: status === 'pending'
  };
};

export default useStartAsteroidScan;
