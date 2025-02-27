import { useCallback, useContext, useMemo } from 'react';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useShip from '~/hooks/useShip';
import useCrewContext from '~/hooks/useCrewContext';

// TODO: combine this with useControlAsteroid?
const useControlShip = (id) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: ship } = useShip(id);
  const { crew: caller_crew } = useCrewContext();

  const controlShip = useCallback(
    () => execute('CommandeerShip', { ship, caller_crew }),
    [execute, ship, caller_crew]
  );

  const status = useMemo(
    () => getStatus('CommandeerShip', { ship, caller_crew }),
    [getStatus, ship, caller_crew]
  );

  return {
    controlShip,
    takingControl: status === 'pending',
    alreadyControlled: ship?.Control?.controller?.id === caller_crew?.id
  };
};

export default useControlShip;
