import { Entity } from '@influenceth/sdk';

import usePriceConstants from './usePriceConstants';

const useSale = (type) => {
  const { data: priceConstants, isLoading } = usePriceConstants();
  if (!isLoading && priceConstants) {
    if (type === Entity.IDS.ASTEROID) {
      return !!(priceConstants.ASTEROID_PURCHASE_BASE_PRICE && priceConstants.ASTEROID_PURCHASE_LOT_PRICE && priceConstants.ASTEROID_PURCHASE_TOKEN);
    } else if (type === Entity.IDS.CREWMATE) {
      return !!(priceConstants.ADALIAN_PURCHASE_PRICE && priceConstants.ADALIAN_PURCHASE_TOKEN);
    }
  }
  return false;
};

export default useSale;
