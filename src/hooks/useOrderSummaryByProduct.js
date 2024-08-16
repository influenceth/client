import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOrderSummaryByProduct = (entity) => {
  return useQuery(
    [ 'productOrderSummary', entity.label, Number(entity.id) ],
    () => api.getOrderSummaryByProduct(entity),
    { enabled: !!entity }
  );
};

export default useOrderSummaryByProduct;
