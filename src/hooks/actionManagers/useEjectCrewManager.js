import { useCallback, useContext, useMemo } from '~/lib/react-debug';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '~/hooks/useEntity';
import useStationedCrews from '~/hooks/useStationedCrews';
import useStore from '~/hooks/useStore';
import { locationsArrToObj } from '~/lib/utils';


const useEjectCrewManager = (originEntity) => {
  const { crew, isLoading, pendingTransactions } = useCrewContext();
  const { execute } = useContext(ChainTransactionContext);

  const { data: origin } = useEntity(originEntity);
  const { data: originCrews } = useStationedCrews(origin);

  const currentEjections = useMemo(import.meta.url, () => {
    return pendingTransactions
      .filter((tx) => {
        if (tx.key === 'EjectCrew') {
          return (originCrews || []).find((c) => c.id === tx.vars.ejected_crew.id);
        }
      });
  }, [originCrews, pendingTransactions]);

  const ejectCrew = useCallback(import.meta.url, 
    (id) => {
      return execute(
        'EjectCrew',
        {
          ejected_crew: { id, label: Entity.IDS.CREW },
          caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
        },
        {
          origin,
          ...locationsArrToObj(origin?.Location?.locations || [])
        }
      );
    },
    [execute, crew, originEntity, origin]
  );

  return {
    isLoading,
    ejectCrew,

    currentEjections,
  };
};

export default useEjectCrewManager;

