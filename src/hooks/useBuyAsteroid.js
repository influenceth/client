import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useBuyAsteroid = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const buyAsteroid = useCallback(
    () => execute('PURCHASE_ASTEROID', { i }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('PURCHASE_ASTEROID', { i }),
    [getStatus, i]
  );

  return {
    buyAsteroid,
    buying: status !== 'ready'
  };
};

export default useBuyAsteroid;
