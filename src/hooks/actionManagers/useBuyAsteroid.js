import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useAsteroid from '~/hooks/useAsteroid';
import useBlockTime from '~/hooks/useBlockTime';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const useBuyAsteroid = (id) => {
  const blockTime = useBlockTime();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: asteroid } = useAsteroid(id);
  const { crew: caller_crew } = useCrewContext();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const system = asteroid?.AsteroidProof?.used ? 'PurchaseAsteroid' : 'InitializeAndPurchaseAsteroid';

  const buyAsteroid = useCallback(
    () => execute(system, { asteroid, caller_crew }),
    [execute, system, asteroid, caller_crew]
  );

  const checkForLimit = useCallback(async () => {
    const saleData = (await api.getAsteroidSale()) || {}; // jit check
    const currentPeriod = Math.floor(blockTime / 1000 / 1000000);
    const volume = Number(saleData.volume) || 0;
    const limit = Number(saleData.limit) || 0;

    if (limit === 0) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: 'Asteroid sales are not currently active.' },
        duration: 5000
      });

      return true;
    }

    if (volume >= limit) {
      const nextPeriod = new Date((currentPeriod + 1) * 1000 * 1000000);

      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: `The maximum number of asteroids have been sold this period. Next sale begins ${nextPeriod.toLocaleString()}.` },
        duration: 5000
      });

      return true;
    }

    return false;
  }, []);

  const status = useMemo(
    () => getStatus(system, { asteroid, caller_crew }),
    [getStatus, system, asteroid, caller_crew]
  );

  return {
    buyAsteroid,
    checkForLimit,
    buying: status === 'pending'
  };
};

export default useBuyAsteroid;
