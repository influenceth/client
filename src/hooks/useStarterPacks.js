import { useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Building, Process } from '@influenceth/sdk';
import { cloneDeep, trim } from 'lodash';

import { MyAssetDoubleIcon, MyAssetIcon, MyAssetTripleIcon } from '~/components/Icons';
import useShoppingListData from '~/hooks/useShoppingListData';
import api from '~/lib/api';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import { ordersToFills } from '~/lib/utils';
import theme from '~/theme';

export const barebonesCrewmateAppearance = '0x1200010000000000041';

const buildingIdsToShoppingList = (buildingIds) => {
  return buildingIds.reduce((acc, b) => {
    const inputs = Process.TYPES[Building.TYPES[b].processType].inputs;
    Object.keys(inputs).forEach((product) => {
      if (!acc[product]) acc[product] = 0;
      acc[product] += inputs[product];
    });
    return acc;
  }, {});
};

const useGetMarketCostForBuildingList = (uniqueProductIds) => {
  const {
    data: resourceMarketplaces,
    dataUpdatedAt: resourceMarketplacesUpdatedAt,
  } = useShoppingListData(1, 0, uniqueProductIds);

  return useCallback((buildingIds) => {
    if (!resourceMarketplaces) return 0;

    // get instance of resourceMarketplaces that we can be destructive with
    const dynamicMarketplaces = cloneDeep(resourceMarketplaces);

    // split building list into granular orders
    const allOrders = buildingIds.reduce((acc, b) => {
      const inputs = Process.TYPES[Building.TYPES[b].processType].inputs;
      Object.keys(inputs).forEach((productId) => {
        acc.push({ productId, amount: inputs[productId] });
      });
      return acc;
    }, []);

    // sort by size desc
    allOrders.sort((a, b) => b.amount - a.amount);
    
    // walk through orders... for each, get best remaining price, then continue
    allOrders.forEach((order) => {
      let totalFilled = 0;
      let totalPaid = 0;
      if (dynamicMarketplaces[order.productId]) {

        // for each marketplace, set _dynamicUnitPrice for min(target, avail)
        dynamicMarketplaces[order.productId].forEach((row) => {
          let marketFills = ordersToFills(
            'buy',
            row.orders,
            Math.min(row.supply, order.amount),
            row.marketplace?.Exchange?.takerFee || 0,
            1,
            row.feeEnforcement || 1
          );
          const marketplaceCost = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0);
          const marketplaceFilled = marketFills.reduce((acc, cur) => acc + cur.fillAmount, 0);
          row._dynamicUnitPrice = marketplaceCost / marketplaceFilled;
        });

        // sort by _dynamicUnitPrice (asc)
        dynamicMarketplaces[order.productId].sort((a, b) => a._dynamicUnitPrice - b._dynamicUnitPrice);

        // process orders destructively until target met
        dynamicMarketplaces[order.productId].every((row) => {
          let marketFills = ordersToFills(
            'buy',
            row.orders,
            Math.min(row.supply, order.amount - totalFilled),
            row.marketplace?.Exchange?.takerFee || 0,
            1,
            row.feeEnforcement || 1,
            true
          );
          const marketplaceCost = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0);
          const marketplaceFilled = marketFills.reduce((acc, cur) => acc + cur.fillAmount, 0);

          row.supply -= marketplaceFilled;
          totalPaid += marketplaceCost;
          totalFilled += marketplaceFilled;
          return (totalFilled < order.amount);
        });

      }

      order.cost = totalPaid / TOKEN_SCALE[TOKEN.SWAY];
      if (totalFilled < order.amount) {
        console.warn(`Unable to fill productId ${order.productId}! ${totalFilled} < ${order.amount}`);
      }
    });

    return allOrders.reduce((acc, o) => acc + o.cost, 0);
  }, [resourceMarketplacesUpdatedAt])
};

const useStarterPacks = () => {
  const { data: products } = useQuery(['stripeProducts'], () => api.getStripeProducts());

  const uniqueProductIds = useMemo(() => {
    const uniqueBuildingIds = (products || []).reduce((acc, cur) => {
      (cur.metadata.buildings.split(',') || []).forEach((buildingId) => acc.add(Number(buildingId)));
      return acc;
    }, new Set());

    return Array.from(
      new Set(
        ...Object.keys(
          buildingIdsToShoppingList(
            Array.from(uniqueBuildingIds)
          )
        )
      )
    );
  }, [products]);
  
  const getMarketCostForBuildingList = useGetMarketCostForBuildingList(uniqueProductIds);

  const starterPackPricing = useMemo(() => {
    const packs = {};
    (products || [])
      .sort((a, b) => a.amount - b.amount)
      .forEach((product, i) => {
        let ui = {
          checkMarks: product.metadata.checkMarks?.split('|') || [],
          flavorText: product.metadata.flavorText
        };

        if (i === 0) {
          ui.crewmateAppearance = barebonesCrewmateAppearance;
          ui.color = theme.colors.glowGreen;
          ui.colorLabel = 'green';
          ui.flairIcon = <MyAssetIcon />;
        } else if (i === 1 && products.length > 2) {
          ui.crewmateAppearance = '0x2700020002000300032'; //'0x22000200070002000a2'
          ui.color = theme.colors.main;
          ui.colorLabel = undefined;
          ui.flairIcon = <MyAssetDoubleIcon />;
        } else {
          ui.crewmateAppearance = '0x30001000400070002000a2'; //'0x3000100030002000300032'
          ui.color = theme.colors.lightPurple;
          ui.colorLabel = 'purple';
          ui.flairIcon = <MyAssetTripleIcon />;
        }

        const buildingIds = (product.metadata.buildings.split(',') || []).map(Number);
        packs[product.id] = {
          id: product.id,
          name: trim(product.name.replace('Starter Pack -', '')),
          price: product.amount,
          crewmates: product.metadata.crewmates,
          buildings: buildingIds,
          buildingValue: getMarketCostForBuildingList(buildingIds),
          ui
        }
      });
    console.log({ packs })
    return Object.values(packs);
  }, [getMarketCostForBuildingList, products]);

  return starterPackPricing;
};

export default useStarterPacks;