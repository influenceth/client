import { useMemo } from 'react';

import useSwapQuote from '~/hooks/useSwapQuote';
import { useEthBalance, useUSDCBalance } from '~/hooks/useWalletBalance';

const useWalletUSD = (overrideAccount) => {
  const { data: weiBalance, isLoading: isLoading1 } = useEthBalance(overrideAccount);
  const { data: usdcBalance, isLoading: isLoading2 } = useUSDCBalance(overrideAccount);
  const { data: usdcPerEth, isLoading: isLoading3 } = useSwapQuote(process.env.REACT_APP_ERC20_TOKEN_ADDRESS, process.env.REACT_APP_USDC_TOKEN_ADDRESS, /* 1, accountAddress */);

  const isLoading = isLoading1 || isLoading2 || isLoading3;
  return useMemo(() => {
    const ethBalance = (parseFloat(weiBalance) || 0) / 1e18;
    const ethBalanceUSD = ethBalance * parseFloat(usdcPerEth || 3807.62);// TODO: || 0);
    const usdcBalanceUSD = parseFloat(usdcBalance) || 0;
    return {
      data: isLoading ? null : {
        totalUSD: ethBalanceUSD + usdcBalanceUSD,
        ethBalance,
        ethBalanceUSD,
        usdcBalance: parseFloat(usdcBalance),
        usdcBalanceUSD,
      },
      isLoading
    };
  }, [usdcBalance, usdcPerEth, weiBalance, isLoading]);
}

export default useWalletUSD;