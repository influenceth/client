import { useMemo } from 'react';

import usePriceHelper from '~/hooks/usePriceHelper';
import { useUsdcPerEth } from '~/hooks/useSwapQuote';
import { useEthBalance, useUSDCBalance } from '~/hooks/useWalletBalance';
import { TOKEN } from '~/lib/priceUtils';

// TODO: rename useWalletHelper or something
// (or deprecate since this is mostly handled by priceHelper)
const useWalletUSD = (overrideAccount) => {
  const priceHelper = usePriceHelper();
  const { data: weiBalance, isLoading: isLoading1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2 } = useUSDCBalance(overrideAccount);
  const { data: usdcPerEth, isLoading: isLoading3 } = useUsdcPerEth(overrideAccount);

  const isLoading = isLoading1 || isLoading2 || isLoading3;
  return useMemo(() => {
    return {
      data: isLoading ? null : {
        getCombinedSwappableBalance: (denomToken, format) => {
          const combined = priceHelper.from(weiBalance, TOKEN.ETH);
          combined.usdcBalance += priceHelper.from(usdcBalance, TOKEN.USDC)?.usdcBalance;
          return combined.to(denomToken, format);
        },
        getTokenBalance: (token, denomToken, format) => {
          let balance;
          if (token === TOKEN.USDC) {
            balance = priceHelper.from(usdcBalance, TOKEN.USDC);
          } else if (token === TOKEN.ETH) {
            balance = priceHelper.from(weiBalance, TOKEN.ETH);
          } else {
            throw new Error('invalid token');
          }
          return balance.to(denomToken || token, format);
        },
        // TODO: these should be deprecated?
        ethBalance: 0,
        usdcBalance: 0,
        ethBalanceUSD: 0,
        usdcBalanceUSD: 0,
        totalValueUSD: 0,
      },
      isLoading
    };
  }, [usdcBalance, usdcPerEth, weiBalance, isLoading]);
}

export default useWalletUSD;