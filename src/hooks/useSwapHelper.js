import { useCallback, useMemo } from 'react';
import { fetchBuildExecuteTransaction } from '@avnu/avnu-sdk';

import useStore from '~/hooks/useStore';
import useWalletBalances from '~/hooks/useWalletBalances';
import { TOKEN } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import api from '~/lib/api';
import useSession from '~/hooks/useSession';

const avnuOptions = { baseUrl: process.env.REACT_APP_AVNU_API_URL };

const useSwapHelper = () => {
  const { accountAddress } = useSession();
  const { data: wallet } = useWalletBalances();
  
  const priceHelper = usePriceHelper();
  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());

  const buildMultiswapFromSellAmount = useCallback(async (sellAmountUSDC, targetToken, allowableSlippage = 0.1) => {
    const swappableTokens = Object.keys(wallet?.tokenBalance).filter((t) => t !== targetToken);
    swappableTokens.sort((a) => a === preferredUiCurrency ? -1 : 1);
    
    const calls = [];
    const initialTargetUSDC = (sellAmountUSDC || 0);
    let remainingTargetUSDC = initialTargetUSDC;
    for (let i = 0; i < swappableTokens.length; i++) {
      const token = swappableTokens[i];
      const sellAmount = Math.min(
        priceHelper.from(remainingTargetUSDC, TOKEN.USDC).to(token),
        parseInt(wallet.tokenBalance[token])
      );
      // (if remainingTarget < 0.1% of original, assume rounding error and no need to add additional swaps)
      if (sellAmount > 0 && remainingTargetUSDC > initialTargetUSDC * 0.001) {
        const quotes = await api.getSwapQuote({
          sellToken: token,
          buyToken: targetToken,
          amount: sellAmount,
          account: accountAddress
        });
        if (quotes?.[0]) {
          remainingTargetUSDC -= priceHelper.from(sellAmount, token).to(TOKEN.USDC);

          const swapTx = await fetchBuildExecuteTransaction(
            quotes?.[0].quoteId,
            accountAddress,
            undefined,
            true,
            avnuOptions
          );
          calls.push(...swapTx.calls);
        }
      }
    }

    if (remainingTargetUSDC > initialTargetUSDC * allowableSlippage) {
      return false;
    }
    return calls;
  }, [wallet]);

  return useMemo(
    () => ({ buildMultiswapFromSellAmount }),
    [buildMultiswapFromSellAmount]
  );
};

export default useSwapHelper;