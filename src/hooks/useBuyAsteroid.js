import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useBuyAsteroid = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const buyAsteroid = useCallback(
    () => execute('BUY_ASTEROID', { i }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('BUY_ASTEROID', { i }),
    [getStatus, i]
  );

  return {
    buyAsteroid,
    buying: status === 'pending'
  };
};

export default useBuyAsteroid;
