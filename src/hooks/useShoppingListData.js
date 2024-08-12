import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crew, Crewmate, Lot, Permission } from '@influenceth/sdk';

import useAsteroidBuildings from '~/hooks/useAsteroidBuildings';
import useShoppingListOrders from '~/hooks/useShoppingListOrders';
import api from '~/lib/api';

const useShoppingListData = (asteroidId, lotId, productIds) => {
  const {
    data: exchanges,
    isLoading: exchangesLoading,
    dataUpdatedAt: exchangesUpdatedAt,
    refetch: refetchExchanges
  } = useAsteroidBuildings(asteroidId, 'Exchange', Permission.IDS.BUY);

  const lastValue = useRef();

  // TODO: how much effort would it be to include feeEnforcement in elasticsearch on exchanges
  const [feeEnforcements, setFeeEnforcements] = useState();
  const [feesLoading, setFeesLoading] = useState();
  const loadFees = useCallback(async () => {
    const ids = (exchanges || []).map((e) => e.Control?.controller?.id);
    if (ids?.length > 0) {
      setFeesLoading(true);
      try {
        const crewmates = await api.getCrewmatesOfCrews(ids);
        const crews = crewmates.reduce((acc, c) => {
          const crewId = c.Control?.controller?.id;
          if (crewId) {
            if (!acc[crewId]) acc[crewId] = [];
            acc[crewId].push(c);
          }
          return acc;
        }, {});

        const fees = {};
        Object.keys(crews).forEach((crewId) => {

          // NOTE: this only works because we know MARKETPLACE_FEE_ENFORCEMENT is `notFurtherModified`
          // (if that changes, would need to pull more data from Crew as well)
          const crewFeeEnforcement = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.MARKETPLACE_FEE_ENFORCEMENT, crews[crewId]);
          exchanges.filter((e) => e.Control?.controller?.id === Number(crewId)).forEach((e) => {
            fees[e.id] = crewFeeEnforcement.totalBonus;
          });
        });
        setFeeEnforcements(fees);
      } catch (e) {
        console.warn(e);
      }
      setFeesLoading(false);
    }
  }, [exchangesUpdatedAt]);
  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useShoppingListOrders(asteroidId, productIds);

  const isLoading = exchangesLoading || feesLoading || ordersLoading;
  return useMemo(() => {
    const refetch = () => {
      refetchExchanges();
      refetchOrders();
    };

    if (isLoading) {
      return {
        data: lastValue.current,
        isLoading: true,
        dataUpdatedAt: Date.now(),
        refetch
      };
    }

    const finalData = {};
    if (feeEnforcements && exchanges && orders) {
      Object.keys(orders).forEach((productId) => {
        finalData[productId] = [];
        Object.keys(orders[productId]).forEach((buildingId) => {
          const o = orders[productId][buildingId];
          const marketplace = exchanges.find((e) => e.id === Number(buildingId));

          if (marketplace) {
            o.marketplace = marketplace;
            o.distance = lotId > 0 ? Asteroid.getLotDistance(asteroidId, Lot.toIndex(o.lotId), Lot.toIndex(lotId)) : 0;
            o.feeEnforcement = feeEnforcements[buildingId] || 1;
            finalData[productId].push(o);
          }
        });
      });
      lastValue.current = finalData;
    }

    return {
      data: finalData,
      dataUpdatedAt: Date.now(),
      isLoading: false,
      refetch
    };
  }, [asteroidId, lotId, isLoading, feeEnforcements, exchangesUpdatedAt, orders]);
};

export default useShoppingListData;