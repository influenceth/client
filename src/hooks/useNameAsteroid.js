import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const useNameAsteroid = (id) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const entity = useMemo(() => ({ id, label: Entity.IDS.ASTEROID }), [id]);
  const caller_crew = useMemo(() => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const nameAsteroid = useCallback(
    (name) => execute('ChangeName', { entity, name, caller_crew, }),
    [execute, entity, caller_crew]
  );

  const status = useMemo(
    () => getStatus('ChangeName', { entity }),
    [getStatus, entity]
  );

  return {
    nameAsteroid,
    naming: status === 'pending'
  };
};

export default useNameAsteroid;
