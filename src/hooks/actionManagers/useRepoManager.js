import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

const useRepoManager = (lotId) => {
  const { crew, isLoading } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { data: lot } = useLot(lotId);

  const payload = useMemo(() => ({
    building: { id: lot?.building?.id, label: Entity.IDS.BUILDING },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [crew?.id, lot?.building?.id]);

  const repoBuilding = useCallback(
    () => execute('RepossessBuilding', payload, { lotId }),
    [execute, lotId, payload]
  );

  const currentRepo = useMemo(
    () => getPendingTx ? getPendingTx('RepossessBuilding', payload) : null,
    [getPendingTx, payload]
  );

  return {
    isLoading,
    repoBuilding,

    currentRepo,
    actionStage: currentRepo ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useRepoManager;
