import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useStore from './useStore';

const useAsteroidScan = (asteroid) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const i = asteroid ? Number(asteroid.i) : null;

  const startAsteroidScan = useCallback(
    () => {
      createAlert({
        type: 'GenericAlert',
        content: 'Crewmate name changes are disabled as we complete the L2 Asset Bridge. Stay tuned.',
      })
    },
    //() => execute('START_ASTEROID_SCAN', { i }),
    [createAlert, execute, i]
  );

  const finalizeAsteroidScan = useCallback(
    () => {
      createAlert({
        type: 'GenericAlert',
        content: 'Crewmate name changes are disabled as we complete the L2 Asset Bridge. Stay tuned.',
      })
    },
    // () => execute('FINALIZE_ASTEROID_SCAN', { i }),
    [createAlert, execute, i]
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
