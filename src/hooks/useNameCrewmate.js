import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';

const useNameCrewmate = (i) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const nameCrewmate = useCallback(
    (name) => execute('NAME_CREWMATE', { i, name }),
    [execute, i]
  );

  const status = useMemo(
    () => getStatus('NAME_CREWMATE', { i }),
    [getStatus, i]
  );

  return {
    nameCrewmate,
    naming: status === 'pending'
  };
};

export default useNameCrewmate;
