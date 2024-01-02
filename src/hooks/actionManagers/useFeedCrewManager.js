import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import actionStages from '~/lib/actionStages';

const useFeedCrewManager = (entity) => {
  const { crew, isLoading } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);

  const caller_crew = useMemo(() => ({ id: crew?.id, label: Entity.IDS.CREW }), [crew?.id]);

  const feedCrew = useCallback(
    ({ origin, originSlot, amount }) => execute('ResupplyFood', {
      origin,
      origin_slot: originSlot,
      food: amount,
      caller_crew
    }),
    [execute, caller_crew]
  );

  const currentFeeding = useMemo(
    () => getPendingTx ? getPendingTx('ResupplyFood', { caller_crew }) : null,
    [caller_crew, getPendingTx]
  );

  return {
    isLoading,
    feedCrew,
    currentFeeding,
    actionStage: currentFeeding ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useFeedCrewManager;
