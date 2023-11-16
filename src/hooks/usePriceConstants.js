import useConstants from './useConstants';

const usePriceConstants = () => {
  return useConstants(['ASTEROID_BASE_PRICE_ETH', 'ASTEROID_LOT_PRICE_ETH', 'ADALIAN_PRICE_ETH']);
};

export default usePriceConstants;
