import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

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
  const { crew } = useCrewContext();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const system = asteroid?.AsteroidProof?.used ? 'PurchaseAsteroid' : 'InitializeAndPurchaseAsteroid';

  const buyAsteroid = useCallback(import.meta.url, () => {
    // caller_crew is optional here b/c may not exist yet
    return execute(
      system,
      {
        asteroid,
        caller_crew: crew || { id: 0, label: Entity.IDS.CREW }
      }
    );
  }, [execute, system, asteroid, crew]);

  const checkForLimit = useCallback(import.meta.url, async () => {
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

  const status = useMemo(import.meta.url, 
    () => getStatus(system, { asteroid }),
    [getStatus, system, asteroid]
  );

  return {
    buyAsteroid,
    checkForLimit,
    buying: status === 'pending'
  };
};

export default useBuyAsteroid;
