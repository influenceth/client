import { useCallback, useContext, useMemo } from '~/lib/react-debug';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useAsteroid from '~/hooks/useAsteroid';
import useCrewContext from '~/hooks/useCrewContext';

const useControlAsteroid = (id) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: asteroid } = useAsteroid(id);
  const { crew: caller_crew } = useCrewContext();

  const system = asteroid?.AsteroidProof?.used ? 'ManageAsteroid' : 'InitializeAndManageAsteroid';

  const controlAsteroid = useCallback(import.meta.url, 
    () => execute(system, { asteroid, caller_crew }),
    [execute, asteroid, caller_crew, system]
  );

  const status = useMemo(import.meta.url, 
    () => getStatus(system, { asteroid, caller_crew }),
    [getStatus, asteroid, caller_crew, system]
  );

  return {
    controlAsteroid,
    takingControl: status === 'pending',
    alreadyControlled: asteroid?.Control?.controller?.id === caller_crew?.id
  };
};

export default useControlAsteroid;
