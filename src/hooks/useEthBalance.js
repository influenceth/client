import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useSession from './useSession';

const useEthBalance = (overrideAccount) => {
  const { accountAddress: defaultAccount, starknet } = useSession();
  const accountAddress = overrideAccount || defaultAccount;

  return useQuery(
    [ 'ethBalance', accountAddress ],
    async () => {
      try {
        const balance = await starknet.provider.callContract({
          contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
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
}

export default useEthBalance;