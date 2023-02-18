import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useNameCrew = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const nameCrew = useCallback(
    (name) => execute('NAME_CREWMATE', { i, name }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('NAME_CREWMATE', { i }),
    [getStatus, i]
  );

  return {
    nameCrew,
    naming: status === 'pending'
  };
};

export default useNameCrew;
