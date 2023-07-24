import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useStore from './useStore';

const useNameCrew = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const nameCrew = useCallback(
    // (name) => execute('NAME_CREW', { i, name }),
    () => {
      createAlert({
        type: 'GenericAlert',
        content: 'Crewmate name changes are disabled as we complete the L2 Asset Bridge. Stay tuned.',
      })
    },
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('NAME_CREW', { i }),
    [getStatus, i]
  );

  return {
    nameCrew,
    naming: status === 'pending'
  };
};

export default useNameCrew;
