import { useQuery } from 'react-query';

import api from '~/lib/api';
import { locationsArrToObj } from '~/lib/utils';

const useShoppingListOrders = (asteroidId, productIds) => {
  // TODO: ideally could somehow partion this by productId in cache keys
  return useQuery(
    [ 'shoppingOrderList', Number(asteroidId), productIds ],
    async () => {
      const empties = productIds.reduce((a, p) => ({ ...a, [p]: {} }), {});
      const orders = await api.getSellOrdersByProduct(asteroidId, productIds);
      return orders.reduce((acc, o) => {
        const loc = locationsArrToObj(o.locations || []);
        if (!acc[o.product][loc.buildingId]) {
          acc[o.product][loc.buildingId] = {
            lotId: loc.lotId,
            buildingId: loc.buildingId,
            supply: 0,
            orders: [],
          };
        }
        acc[o.product][loc.buildingId].supply += o.amount;
        acc[o.product][loc.buildingId].orders.push(o);

        return acc;
      }, empties);
    },
    { enabled: !!asteroidId && !!productIds?.length }
  );
}

export default useShoppingListOrders;
