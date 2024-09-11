import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const useChangeName = (entity) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const caller_crew = useMemo(import.meta.url, () => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const changeName = useCallback(import.meta.url, 
    (name) => execute('ChangeName', { entity, name, caller_crew }),
    [execute, entity, caller_crew]
  );

  const status = useMemo(import.meta.url, 
    () => getStatus('ChangeName', { entity }),
    [getStatus, entity]
  );

  return {
    changeName,
    changingName: status === 'pending'
  };
};

export default useChangeName;
