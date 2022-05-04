import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useNameAsteroid = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const nameAsteroid = useCallback(
    (name) => execute('NAME_ASTEROID', { i, name }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('NAME_ASTEROID', { i }),
    [getStatus, i]
  );

  return {
    nameAsteroid,
    naming: status === 'pending'
  };
};

export default useNameAsteroid;
