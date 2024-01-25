import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '../useEntity';

const useMarketplaceAdmin = (buildingId) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: building } = useEntity({ id: buildingId, label: Entity.IDS.BUILDING });

  const payload = useMemo(() => ({
    exchange: { id: buildingId, label: Entity.IDS.BUILDING },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [crew?.id, buildingId]);

  const changeSettings = useCallback(
    ({ makerFee, takerFee, allowedProducts }) => execute(
      'ConfigureExchange',
      {
        maker_fee: makerFee,
        taker_fee: takerFee,
        allowed_products: allowedProducts,
        ...payload
      }, 
      {
        lotId: building?.Location?.location?.id
      }
    ),
    [building, execute, payload]
  );

  const status = useMemo(
    () => getStatus('ConfigureExchange', { ...payload }),
    [getStatus, payload]
  );

  return {
    changeSettings,
    changingSettings: status === 'pending'
  };
};

export default useMarketplaceAdmin;
