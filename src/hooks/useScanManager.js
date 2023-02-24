import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from './useActionItems';

const useScanManager = (asteroid) => {
  const { readyItems, liveBlockTime } = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const payload = useMemo(() => ({
    i: asteroid ? Number(asteroid.i) : null
  }), [asteroid?.i]);

  const startAsteroidScan = useCallback(
    () => execute('START_ASTEROID_SCAN', {
      ...payload,
      boost: asteroid.boost,
      _packed: asteroid._packed,
      _proofs: asteroid._proofs
    }),
    [execute, payload, asteroid]
  );

  const finalizeAsteroidScan = useCallback(
    () => execute('FINISH_ASTEROID_SCAN', payload),
    [execute, payload]
  );

  const scanStatus = useMemo(() => {
    if (asteroid) {
      if (asteroid.scanned) {
        return 'FINISHED';
      } else if(asteroid.scanCompletionTime > 0) {
        if(getStatus('FINISH_ASTEROID_SCAN', payload) === 'pending') {
          return 'FINISHING';
        } else if (asteroid.scanCompletionTime <= liveBlockTime) {
          return 'READY_TO_FINISH';
        }
        return 'SCANNING';
      } else if (getStatus('START_ASTEROID_SCAN', payload) === 'pending') {
        return 'SCANNING';
      }
    }
    return 'UNSCANNED';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [ asteroid, getStatus, payload, readyItems ]);

  return {
    startAsteroidScan,
    finalizeAsteroidScan,
    scanStatus
  };
};

export default useScanManager;
