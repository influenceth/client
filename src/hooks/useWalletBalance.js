import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useSession from './useSession';

const useWalletBalance = (tokenLabel, tokenAddress, overrideAccount, scaleFactor = 1) => {
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
        const unscaled = uint256.uint256ToBN({ low: balance?.[0] || 0, high: balance?.[1] || 0 });
        return unscaled / BigInt(scaleFactor);
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
  return useWalletBalance('eth', process.env.REACT_APP_ERC20_TOKEN_ADDRESS, overrideAccount);
};

export const useSwayBalance = (overrideAccount) => {
  return useWalletBalance('sway', process.env.REACT_APP_STARKNET_SWAY_TOKEN, overrideAccount, 1000000);
}

export const useUSDCBalance = (overrideAccount) => {
  return useWalletBalance('usdc', process.env.REACT_APP_USDC_TOKEN_ADDRESS, overrideAccount);
}

export default useWalletBalance;