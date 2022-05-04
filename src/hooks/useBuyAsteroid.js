import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useBuyAsteroid = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: sale } = useSale();

  // BUY_ASTEROID_1ST_SALE references fisrt sale to support testnet usage
  const contractKey = sale && !sale.endCount ? 'BUY_ASTEROID_1ST_SALE' : 'BUY_ASTEROID';

  const buyAsteroid = useCallback(
    () => execute(contractKey, { i }),
    [execute, contractKey, i]
  );

  const status = useMemo(
    () => getStatus(contractKey, { i }),
    [getStatus, contractKey, i]
  );

  return {
    buyAsteroid,
    buying: status === 'pending'
  };
};

export default useBuyAsteroid;
