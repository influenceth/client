import { useCallback, useContext, useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useEntity from '../useEntity';
import useCrewOrders from '../useCrewOrders';
import useStore from '../useStore';
import useHydratedCrew from '../useHydratedCrew';
import api from '~/lib/api';

// TODO: product could probably be incorporated into props + payload
const useMarketplaceManager = (buildingId) => {
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: exchange } = useEntity({ id: buildingId, label: Entity.IDS.BUILDING });
  const { data: exchangeController } = useHydratedCrew(exchange?.Control?.controller?.id);
  console.log('exchangeController', exchangeController);

  const { data: orders, isLoading } = useCrewOrders(crew?.id);

  const pendingTransactions = useStore(s => s.pendingTransactions);

  const payload = useMemo(() => ({
    exchange: { id: buildingId, label: Entity.IDS.BUILDING },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [crew?.id, buildingId]);

  // CreateSellOrder, CancelSellOrder, FillSellOrder
  // CreateBuyOrder, CancelBuyOrder?, FillBuyOrder

  const pendingLimitOrders = useMemo(() => {
    return pendingTransactions.filter(({ key, vars }) => (
      (key === 'CreateSellOrder' || key === 'CreateBuyOrder')

    ));
  }, []);


  const createBuyOrder = useCallback(
    ({ product, amount, price, destination, destinationSlot, feeTotal }) => execute(
      'EscrowDepositAndCreateBuyOrder',
      {
        buyer_crew: { id: crew?.id, label: crew?.label },
        product,
        amount,
        price: price * 1e6,
        storage: { id: destination?.id, label: destination?.label },
        storage_slot: destinationSlot,
        feeTotal,
        ...payload
      },
      {
        lotId: exchange?.Location?.location?.id
      },
    ),
    [crew, payload]
  );
  const createSellOrder = useCallback(
    ({ product, amount, price, origin, originSlot }) => execute(
      'CreateSellOrder',
      {
        product,
        amount,
        price: price * 1e6,
        storage: { id: origin?.id, label: origin?.label },
        storage_slot: originSlot,
        ...payload
      },
      {
        lotId: exchange?.Location?.location?.id
      },
    ),
    [exchange, payload]
  );

  const fillBuyOrders = useCallback(
    ({ product, origin, originSlot, fillOrders }) => {
      if (!fillOrders?.length) return;

      return execute(
        'EscrowWithdrawalAndFillBuyOrders',
        fillOrders.map((order) => ({
          depositCaller: order.initialCaller || crew?.Crew?.delegatedTo,
          seller_account: crew?.Crew?.delegatedTo,
          exchange_owner_account: exchangeController?.Crew?.delegatedTo,
          takerFee: exchange?.Exchange?.takerFee,
  
          origin: { id: origin?.id, label: origin?.label },
          origin_slot: originSlot,
          product,
  
          amount: order.fillAmount,
          buyer_crew: { id: order.crew?.id, label: order.crew?.label },
          price: order.price * 1e6,
          storage: { id: order.storage?.id, label: order.storage?.label },
          storage_slot: order.storageSlot,
  
          ...payload
        })),
        {
          lotId: exchange?.Location?.location?.id,
        },
      );
    },
    [exchangeController, payload]
  );

  const fillSellOrders = useCallback(
    async ({ destination, destinationSlot, product, fillOrders }) => {
      if (!fillOrders?.length) return;
      const sellerCrewIds = fillOrders.map((order) => order.crew?.id);
      const sellerCrews = await api.getEntities({ ids: sellerCrewIds, label: Entity.IDS.CREW, component: 'Crew' })
      execute(
        'BulkFillSellOrder',
        fillOrders.map((order) => ({
          seller_account: sellerCrews.find((c) => c.id === order.crew?.id)?.Crew?.delegatedTo,
          exchange_owner_account: exchangeController?.Crew?.delegatedTo,
          takerFee: exchange?.Exchange?.takerFee,
  
          seller_crew: { id: order.crew?.id, label: order.crew?.label },
          amount: order.fillAmount,
          price: order.price * 1e6,
          storage: { id: order.storage?.id, label: order.storage?.label },
          storage_slot: order.storageSlot,
          
          product,
          destination: { id: destination?.id, label: destination?.label },
          destination_slot: destinationSlot,
          ...payload
        })),
        {
          lotId: exchange?.Location?.location?.id,
        },
      );
    },
    [exchangeController, payload]
  );

  const cancelBuyOrder = useCallback(
    ({ buyer, product, amount, price, destination, destinationSlot, origin, originSlot }) => {
      fillBuyOrders([{ buyer, product, amount, price, destination, destinationSlot, origin, originSlot }])
    },
    [fillBuyOrders]
  );
  const cancelSellOrder = useCallback(
    ({ seller, product, price, origin, originSlot }) => execute(
      'CancelSellOrder',
      {
        seller_crew: { id: seller?.id, label: seller?.label },
        product,
        price: price * 1e6,
        storage: { id: origin?.id, label: origin?.label },
        storage_slot: originSlot,
        ...payload
      },
      {},
    ),
    [payload]
  );

  return {
    createBuyOrder,
    createSellOrder,
    cancelBuyOrder,
    cancelSellOrder,
    fillBuyOrders,
    fillSellOrders,

    // TODO: pending actions (by type?)
  };
};

export default useMarketplaceManager;
