import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useAsteroidScan = (asteroid) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const i = asteroid ? Number(asteroid.i) : null;

  const startAsteroidScan = useCallback(
    () => execute('START_ASTEROID_SCAN', { i }),
    [execute, i]
  );

  const finalizeAsteroidScan = useCallback(
    () => execute('FINALIZE_ASTEROID_SCAN', { i }),
    [execute, i]
  );

  const startingScan = useMemo(
    () => getStatus('START_ASTEROID_SCAN', { i }),
    [getStatus, i]
  );

  const finalizingScan = useMemo(
    () => getStatus('FINALIZE_ASTEROID_SCAN', { i }),
    [getStatus, i]
  );

  const scanStatus = useMemo(() => {
    if (finalizingScan === 'pending') {
      return 'RETRIEVING';
    } else if (startingScan === 'pending') {
      return 'SCANNING';
    }
    return asteroid?.scanStatus || 'UNSCANNED';
  }, [ startingScan, finalizingScan, asteroid?.scanStatus ]);

  return {
    startAsteroidScan,
    finalizeAsteroidScan,
    scanStatus
  };
};

export default useAsteroidScan;
