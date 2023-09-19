import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useAsteroid from './useAsteroid';
import useCrewContext from './useCrewContext';

const useBuyAsteroid = (id) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: asteroid } = useAsteroid(id);
  const { crew: caller_crew } = useCrewContext();

  const system = asteroid?.AsteroidProof?.used ? 'PurchaseAsteroid' : 'InitializeAndPurchaseAsteroid';

  const buyAsteroid = useCallback(
    () => execute(system, { asteroid, caller_crew }),
    [execute, system, asteroid, caller_crew]
  );

  const status = useMemo(
    () => getStatus(system, { asteroid, caller_crew }),
    [getStatus, system, asteroid, caller_crew]
  );

  return {
    buyAsteroid,
    buying: status === 'pending'
  };
};

export default useBuyAsteroid;
