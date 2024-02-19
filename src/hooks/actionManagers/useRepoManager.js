import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

const useRepoManager = (lotId) => {
  const { crew, isLoading } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { isAtRisk } = useConstructionManager(lotId);
  const { data: lot } = useLot(lotId);

  const takeoverType = useMemo(() => {
    // if i'm not in control of the building...
    if (crew?.id !== lot?.building?.Control?.controller?.id) {
      // ... but i am in control of the lot, then i can takeover from squatter
      if (crew?.id === lot?.Control?.controller?.id) return 'squatted';
      // ... or if is on expired site, then i can takeover from anyone
      if (isAtRisk) return 'expired';
    }
    return null;
  }, [crew?.id, isAtRisk, lot?.building?.Control?.controller?.id, lot?.Control?.controller?.id]);

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
    takeoverType,
    actionStage: currentRepo ? actionStages.STARTING : actionStages.NOT_STARTED,
  };
};

export default useRepoManager;
