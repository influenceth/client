import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useSession from './useSession';
import { TOKEN } from '~/lib/priceUtils';

const useWalletTokenBalance = (tokenLabel, tokenAddress, overrideAccount) => {
  const { accountAddress: defaultAccount, starknet } = useSession();

  const accountAddress = overrideAccount || defaultAccount;
  return useQuery(
    [ 'walletBalance', tokenLabel, accountAddress ],
    async () => {
      try {
        const balance = await starknet.provider.callContract({
          contractAddress: tokenAddress,
          entrypoint: 'balanceOf',
          calldata: [accountAddress]
        });
        return uint256.uint256ToBN({ low: balance?.[0] || 0, high: balance?.[1] || 0 });
      } catch (e) {
        console.error(e);
      }
    },
    {
      enabled: !!starknet?.provider && !!accountAddress,
      refetchInterval: 300e3,
    }
  );
};

export const useEthBalance = (overrideAccount) => {
  return useWalletTokenBalance('eth', TOKEN.ETH, overrideAccount);
};

export const useSwayBalance = (overrideAccount) => {
  return useWalletTokenBalance('sway', TOKEN.SWAY, overrideAccount);
}

export const useUSDCBalance = (overrideAccount) => {
  return useWalletTokenBalance('usdc', TOKEN.USDC, overrideAccount);
}

export default useWalletTokenBalance;