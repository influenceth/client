import { useMemo } from 'react';

import usePriceHelper from '~/hooks/usePriceHelper';
import useStore from '~/hooks/useStore';
import { useEthBalance, useUSDCBalance } from '~/hooks/useWalletTokenBalance';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import usePriceConstants from './usePriceConstants';

export const GAS_BUFFER_VALUE_USDC = 2 * TOKEN_SCALE[TOKEN.USDC];

const useWalletBalances = (overrideAccount) => {
  const autoswap = useStore(s => s.gameplay.autoswap);
  const { data: priceConstants } = usePriceConstants();

  const priceHelper = usePriceHelper();
  const { data: ethBalance, isLoading: isLoading1, refetch: refetch1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2, refetch: refetch2 } = useUSDCBalance(overrideAccount);

  // for sanity, just assuming this is the same as ASTEROID_PURCHASE_TOKEN *and*
  // is represented in allTokens list...
  const baseToken = priceConstants?.ADALIAN_PURCHASE_TOKEN;

  const gasReserveBalance = useMemo(() => {
    if ((autoswap || baseToken === TOKEN.ETH) && ethBalance) {
      const ethValueInUSDC = Math.floor(priceHelper.from(ethBalance, TOKEN.ETH)?.usdcValue);
      return priceHelper.from(Math.min(ethValueInUSDC, GAS_BUFFER_VALUE_USDC), TOKEN.USDC);
    }
    return priceHelper.from(0n);
  }, [autoswap, baseToken, ethBalance, priceHelper]);

  const swappableTokenBalances = useMemo(() => {
    const allTokens = {
      [TOKEN.ETH]: ethBalance ? (ethBalance - BigInt(Math.floor(gasReserveBalance.to(TOKEN.ETH)))) : 0n,
      [TOKEN.USDC]: usdcBalance || 0n,
    };

    // if autoswap, return allTokens... else, return just the specified purchase token
    if (autoswap) return autoswap ? allTokens : { [baseToken]: allTokens[baseToken] };
  }, [autoswap, baseToken, ethBalance, gasReserveBalance, usdcBalance]);

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
        gasReserveBalance,
        tokenBalance: swappableTokenBalances
      },
      refetch: () => {
        refetch1();
        refetch2();
      },
      isLoading
    };
  }, [gasReserveBalance, isLoading, priceHelper, swappableTokenBalances]);
}

export default useWalletBalances;