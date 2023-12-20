import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '~/hooks/useEntity';
import useStationedCrews from '~/hooks/useStationedCrews';
import useStore from '~/hooks/useStore';
import { locationsArrToObj } from '~/lib/utils';


const useEjectCrewManager = (originId) => {
  const { crew, isLoading } = useCrewContext();
  const { execute } = useContext(ChainTransactionContext);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const { data: origin } = useEntity(originId);
  const { data: originCrews } = useStationedCrews(originId);

  const currentEjections = useMemo(() => {
    console.log({ originCrews, pendingTransactions });
    return pendingTransactions
      .filter((tx) => {
        if (tx.key === 'EjectCrew') {
          return (originCrews || []).find((c) => c.id === tx.vars.caller_crew.id);
        }
      });
  }, [originCrews, pendingTransactions]);

  const ejectCrew = useCallback(
    (id) => {
      return execute(
        'EjectCrew',
        {
          ejected_crew: { id, label: Entity.IDS.CREW },
          caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
        },
        {
          originId,
          ...locationsArrToObj(origin?.Location?.locations || [])
        }
      );
    },
    [execute, crew, originId, origin]
  );

  return {
    isLoading,
    ejectCrew,

    currentEjections,
  };
};

export default useEjectCrewManager;

