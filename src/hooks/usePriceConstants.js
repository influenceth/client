import useConstants from './useConstants';

const usePriceConstants = () => {
  return useConstants([
    'ASTEROID_PURCHASE_BASE_PRICE',
    'ASTEROID_PURCHASE_LOT_PRICE',
    'ASTEROID_PURCHASE_TOKEN',
    'ADALIAN_PURCHASE_PRICE',
    'ADALIAN_PURCHASE_TOKEN'
  ]);
};

export default usePriceConstants;
