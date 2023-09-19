import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import usePriceConstants from './usePriceConstants';

const useSale = (type) => {
  const { data: priceConstants, isLoading } = usePriceConstants();
  if (!isLoading) {
    if (type === Entity.IDS.ASTEROID) {
      return !!(priceConstants.ASTEROID_BASE_PRICE_ETH && priceConstants.ASTEROID_LOT_PRICE_ETH);
    } else if (type === Entity.IDS.CREWMATE) {
      return !!priceConstants.ADALIAN_PRICE_ETH;
    }
  }
  return false;
};

export default useSale;
