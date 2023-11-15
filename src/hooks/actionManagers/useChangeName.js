import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const useChangeName = (entity) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const caller_crew = useMemo(() => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const changeName = useCallback(
    (name) => execute('ChangeName', { entity, name, caller_crew }),
    [execute, entity, caller_crew]
  );

  const status = useMemo(
    () => getStatus('ChangeName', { entity }),
    [getStatus, entity]
  );

  return {
    changeName,
    changingName: status === 'pending'
  };
};

export default useChangeName;
