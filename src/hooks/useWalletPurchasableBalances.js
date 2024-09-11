import { useMemo } from '~/lib/react-debug';

import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import { useEthBalance, useSwayBalance, useUSDCBalance } from '~/hooks/useWalletTokenBalance';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import { safeBigInt } from '~/lib/utils';

// try to keep a reserve for gas equiv to $2 USD
export const GAS_BUFFER_VALUE_USDC = 2 * TOKEN_SCALE[TOKEN.USDC];

const useWalletPurchasableBalances = (overrideAccount) => {
  const { payGasWithSwayIfPossible } = useSession();
  const { data: priceConstants } = usePriceConstants();
  const { data: ethBalance, isLoading: isLoading1, refetch: refetch1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2, refetch: refetch2 } = useUSDCBalance(overrideAccount);
  const { data: swayBalance, isLoading: isLoading3, refetch: refetch3 } = useSwayBalance(overrideAccount);
  const priceHelper = usePriceHelper();

  const autoswap = useStore(s => s.gameplay.autoswap);

  // for sanity, just assuming this is the same as ASTEROID_PURCHASE_TOKEN *and*
  // is represented in allTokens list...
  const baseToken = priceConstants?.ADALIAN_PURCHASE_TOKEN;

  // reserve eth for gas if not planning to use sway
  // or have <10% of target reserve amount available in sway
  const maintainEthGasReserve = useMemo(import.meta.url, () => {
    const targetSwayReserve = priceHelper.from(GAS_BUFFER_VALUE_USDC * 0.1, TOKEN.USDC).to(TOKEN.SWAY);
    // reserve needed if setting is to pay w/ sway AND have sway
    return !(payGasWithSwayIfPossible && swayBalance > targetSwayReserve)
  }, [payGasWithSwayIfPossible, priceHelper, swayBalance]);

  const ethGasReserveBalance = useMemo(import.meta.url, () => {
    if (maintainEthGasReserve && ethBalance) {
      const ethValueInUSDC = Math.floor(priceHelper.from(ethBalance, TOKEN.ETH)?.usdcValue);
      return priceHelper.from(Math.min(ethValueInUSDC, GAS_BUFFER_VALUE_USDC), TOKEN.USDC);
    }
    return priceHelper.from(0n);
  }, [maintainEthGasReserve, ethBalance, priceHelper]);

  // NOTE: do not add SWAY here unless want SWAY to be auto-swappable for
  //  purchases (i.e. crewmates, starter packs, etc)
  const swappableTokenBalances = useMemo(import.meta.url, () => {
    const allTokens = {
      [TOKEN.ETH]: ethBalance ? (ethBalance - safeBigInt(Math.floor(ethGasReserveBalance.to(TOKEN.ETH)))) : 0n,
      [TOKEN.USDC]: usdcBalance || 0n
    };

    // if autoswap, return allTokens... else, return just the specified purchase token
    return autoswap ? allTokens : { [baseToken]: allTokens[baseToken] };
  }, [autoswap, baseToken, ethBalance, ethGasReserveBalance, usdcBalance]);

  const isLoading = isLoading1 || isLoading2 || isLoading3;
  return useMemo(import.meta.url, () => {
    if (isLoading) return { data: null, refetch: () => {}, isLoading: true };

    const combinedBalance = priceHelper.from(0n);
    Object.keys(swappableTokenBalances).forEach((tokenAddress) => {
      combinedBalance.usdcValue += priceHelper.from(swappableTokenBalances[tokenAddress], tokenAddress)?.usdcValue;
    });
    return {
      data: {
        combinedBalance,
        shouldMaintainEthGasReserve: maintainEthGasReserve,
        ethGasReserveBalance,
        tokenBalances: swappableTokenBalances
      },
      refetch: () => {
        refetch1();
        refetch2();
        refetch3();
      },
      isLoading
    };
  }, [ethGasReserveBalance, isLoading, maintainEthGasReserve, priceHelper, refetch1, refetch2, swappableTokenBalances]);
}

export default useWalletPurchasableBalances;