import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useSession from '~/hooks/useSession';
import { TOKEN } from '~/lib/priceUtils';

<<<<<<< HEAD:src/hooks/useWalletTokenBalance.js
const useWalletTokenBalance = (tokenLabel, tokenAddress, overrideAccount) => {
  const { accountAddress: defaultAccount, starknet } = useSession();
=======
const useEthBalance = (overrideAccount) => {
  const { accountAddress: defaultAccount, provider } = useSession();
  const accountAddress = overrideAccount || defaultAccount;
>>>>>>> fbdbd861 (More sessions work):src/hooks/useEthBalance.js

  const accountAddress = overrideAccount || defaultAccount;
  return useQuery(
    [ 'walletBalance', tokenLabel, accountAddress ],
    async () => {
      if (!accountAddress) return undefined; // shouldn't happen (but seemingly does)
      try {
<<<<<<< HEAD:src/hooks/useWalletTokenBalance.js
        const balance = await starknet.provider.callContract({
          contractAddress: tokenAddress,
=======
        const balance = await provider.callContract({
          contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
>>>>>>> fbdbd861 (More sessions work):src/hooks/useEthBalance.js
          entrypoint: 'balanceOf',
          calldata: [accountAddress]
        });
        const standardized = Array.isArray(balance) ? balance : balance?.result;
        return standardized ? uint256.uint256ToBN({ low: standardized[0], high: standardized[1] }) : 0n;
      } catch (e) {
        console.error(e);
      }
    },
    {
      enabled: !!provider && !!accountAddress,
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