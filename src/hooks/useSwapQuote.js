import { useQuery } from 'react-query';

import api from '~/lib/api';

const useSwapQuote = (sellToken, buyToken, amount = 1, accountAddress = false) => {
  return useQuery(
    [ 'swapQuote', sellToken, buyToken, amount, accountAddress ],
    async () => {
      const quotes = await api.getSwapQuote({
        sellToken,
        buyToken,
        amount,
        account: accountAddress || undefined
      });
      return quotes?.[0] ? (quotes[0].buyAmount / quotes[0].sellAmount) : 0n;
    },
    {
      enabled: !!(sellToken && buyToken),
      refetchInterval: 60e3,
    }
  );
};

export const useSwayPerUsdc = () => {
  return useSwapQuote(
    process.env.REACT_APP_USDC_TOKEN_ADDRESS,
    process.env.REACT_APP_STARKNET_SWAY_TOKEN
  )
};

export const useUsdcPerEth = () => {
  return useSwapQuote(
    process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
    process.env.REACT_APP_USDC_TOKEN_ADDRESS
  )
};

export default useSwapQuote;
