import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const tokens = {
  [Entity.IDS.SHIP]: process.env.REACT_APP_STARKNET_SHIP_TOKEN,
  // TODO: add any nft tokens want to support...
};

const useNftSaleManager = (entity) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const payload = useMemo(() => ({
    tokenAddress: tokens[entity?.label],
    tokenId: entity?.id
  }), [entity]);

  const purchaseListing = useCallback(() => {
    execute(
      'FillNftSellOrder',
      {
        ...payload,
        price: entity?.Nft?.price,
        owner: entity?.Nft?.owner,
        crew
      },
      { entity }
    )
  }, [crew, execute, payload]);

  const updateListing = useCallback(
    (price) => {
      execute(
        'SetNftSellOrder',
        { ...payload, price: price * 1e6 },
        {
          entity
        }
      )
    },
    [execute, payload, entity]
  );

  const isPendingPurchase = useMemo(() => getStatus('FillNftSellOrder', payload) === 'pending', [getStatus, payload]);
  const isPendingUpdate = useMemo(() => getStatus('SetNftSellOrder', payload) === 'pending', [getStatus, payload]);

  return {
    isPendingPurchase,
    isPendingUpdate,
    purchaseListing,
    updateListing,
  };
};

export default useNftSaleManager;
