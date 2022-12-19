import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useScanAsteroid = (asteroid) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const i = asteroid ? Number(asteroid.i) : null;
  
  const startScanPayload = useMemo(() => {
    if (asteroid) {
      return {
        i,
        boost: asteroid.boost,
        _packed: asteroid._packed,
        _proofs: asteroid._proofs
      };
    }
    return null;
  }, [asteroid, i]);

  const startAsteroidScan = useCallback(
    () => execute('START_ASTEROID_SCAN', startScanPayload),
    [execute, startScanPayload]
  );

  const finalizeAsteroidScan = useCallback(
    () => execute('FINISH_ASTEROID_SCAN', { i }),
    [execute, i]
  );

  const startingScan = useMemo(
    () => getStatus('START_ASTEROID_SCAN', startScanPayload),
    [getStatus, startScanPayload]
  );

  const finalizingScan = useMemo(
    () => getStatus('FINISH_ASTEROID_SCAN', { i }),
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

export default useScanAsteroid;
