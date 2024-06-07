import { useMemo } from 'react';

import usePriceHelper from '~/hooks/usePriceHelper';
import useStore from '~/hooks/useStore';
import { useEthBalance, useUSDCBalance } from '~/hooks/useWalletTokenBalance';
import { TOKEN } from '~/lib/priceUtils';
import usePriceConstants from './usePriceConstants';


const useWalletBalances = (overrideAccount) => {
  const autoswap = useStore(s => s.gameplay.autoswap);
  const { data: priceConstants } = usePriceConstants();

  const priceHelper = usePriceHelper();
  const { data: ethBalance, isLoading: isLoading1, refetch: refetch1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2, refetch: refetch2 } = useUSDCBalance(overrideAccount);

  const swappableTokenBalances = useMemo(() => {
    const allTokens = {
      [TOKEN.ETH]: ethBalance,
      [TOKEN.USDC]: usdcBalance,
    };

    // if autoswap, return allTokens... else, return just the specified purchase token
    if (autoswap) return allTokens;

    // for sanity, just assuming this is the same as ASTEROID_PURCHASE_TOKEN *and*
    // is represented in allTokens above...
    if (!priceConstants?.ADALIAN_PURCHASE_TOKEN) return {};
    const baseToken = priceConstants.ADALIAN_PURCHASE_TOKEN;
    return { [baseToken]: allTokens[baseToken] };
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