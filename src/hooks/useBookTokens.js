import { useMemo } from 'react';

import useCrewContext from '~/hooks/useCrewContext';
import { useSwayBalance } from '~/hooks/useWalletTokenBalance';
import formatters from '~/lib/formatters';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import { safeBigInt } from '~/lib/utils';

const useBookTokens = (bookId) => {
  const { captain, isLoading: crewIsLoading } = useCrewContext();
  const { data: dispatcherBalance, isLoading: swayIsLoading } = useSwayBalance(process.env.REACT_APP_STARKNET_DISPATCHER);

  const swayAmount = useMemo(() => {
    if (swayIsLoading) return null;
    const scaledSwayBalance = (dispatcherBalance || 0n) / safeBigInt(TOKEN_SCALE[TOKEN.SWAY]);
    const SWAY_AMOUNT = 30000; // TODO: find better way to get the sway amount (it will change every so often)
    return parseInt(Math.min(SWAY_AMOUNT, Math.floor(Number(scaledSwayBalance) / 1000)));
  }, [dispatcherBalance, swayIsLoading]);

  const bookTokens = useMemo(() => {
    switch (bookId) {
      case 'random-1.json': {
        return {
          swayAmount: Number(swayAmount).toLocaleString()
        };
      }
      case 'random-2.json': {
        return {
          swayAmount: Number(swayAmount).toLocaleString()
        };
      }
      case 'random-3.json': {
        return {
          captainName: formatters.crewmateName(captain),
          swayAmount: Number(swayAmount).toLocaleString(),
          swayAmount1: Number(Math.floor(swayAmount * 0.6)).toLocaleString(),
          swayAmount2: Number(Math.ceil(swayAmount * 0.4)).toLocaleString()
        };
      }
      case 'random-4.json': {
        return {
          captainName: formatters.crewmateName(captain),
          swayAmount: Number(swayAmount).toLocaleString(),
        };
      }
      case 'random-5.json': {
        return {
          captainName: formatters.crewmateName(captain),
          swayAmount: Number(swayAmount).toLocaleString(),
        };
      }
      case 'random-6.json': {
        return {
          captainName: formatters.crewmateName(captain),
          swayAmount: Number(swayAmount).toLocaleString(),
        };
      }
      case 'random-7.json': {
        return {
          swayAmount: Number(swayAmount).toLocaleString(),
        };
      }
      case 'random-8.json': {
        return {
          captainName: formatters.crewmateName(captain),
          swayAmount: Number(swayAmount).toLocaleString(),
        };
      }
      default: {
        return null;
      }
    }
  }, [bookId, captain, swayAmount]);

  return useMemo(() => ({
    bookTokens,
    isLoading: crewIsLoading || (dispatcherBalance === null)
  }), [bookTokens, crewIsLoading, dispatcherBalance]);
}

export default useBookTokens;