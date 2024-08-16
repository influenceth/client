import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOrdersByInventory = (inventory) => {
  return useQuery(
    [ 'inventoryOrders', inventory?.label, Number(inventory?.id) ],
    () => api.getOrdersByInventory(inventory),
    { enabled: !!inventory }
  );
};

export default useOrdersByInventory;
