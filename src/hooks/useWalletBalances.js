import { useMemo } from 'react';

import usePriceHelper from '~/hooks/usePriceHelper';
import { useEthBalance, useUSDCBalance } from '~/hooks/useWalletTokenBalance';
import { TOKEN } from '~/lib/priceUtils';

const useWalletBalances = (overrideAccount) => {
  const swappableTokens = ['ETH', 'USDC'];  // TODO: put in store

  const priceHelper = usePriceHelper();
  const { data: ethBalance, isLoading: isLoading1, refetch: refetch1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2, refetch: refetch2 } = useUSDCBalance(overrideAccount);

  const swappableTokenBalances = useMemo(() => {
    const allTokens = {
      ETH: ethBalance,
      USDC: usdcBalance,
    };
    return swappableTokens.reduce((acc, cur) => {
      acc[TOKEN[cur]] = allTokens[cur];
      return acc;
    }, {});
  }, [ethBalance, usdcBalance]);

  const isLoading = isLoading1 || isLoading2;
  return useMemo(() => {
    if (isLoading) return { data: null, refetch: () => {}, isLoading: true };

    const combinedBalance = priceHelper.from(0n);
    Object.keys(swappableTokenBalances).forEach((tokenAddress) => {
      combinedBalance.usdcValue += priceHelper.from(swappableTokenBalances[tokenAddress], tokenAddress)?.usdcValue;
    });

    return {
      data: {
        combinedBalance,
        tokenBalance: swappableTokenBalances
      },
      refetch: () => {
        refetch1();
        refetch2();
      },
      isLoading
    };
  }, [isLoading, priceHelper, swappableTokenBalances]);
}

export default useWalletBalances;