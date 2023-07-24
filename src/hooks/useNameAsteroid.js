import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useStore from './useStore';

const useNameAsteroid = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const nameAsteroid = useCallback(
    // (name) => execute('NAME_ASTEROID', { i, name }),
    () => {
      createAlert({
        type: 'GenericAlert',
        content: 'Asteroid name changes are disabled as we complete the L2 Asset Bridge. Stay tuned.',
      })
    },
    [createAlert, execute, i]
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
