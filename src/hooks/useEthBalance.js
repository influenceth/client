import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useAuth from './useAuth';

const useEthBalance = (overrideAccount) => {
  const { account: defaultAccount, walletContext: { starknet } } = useAuth();
  const account = overrideAccount || defaultAccount;

  return useQuery(
    [ 'ethBalance', account ],
    async () => {
      try {
        const balance = await starknet.provider.callContract({
          contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
          entrypoint: 'balanceOf',
          calldata: [starknet.account.address]
        });
        return uint256.uint256ToBN({ low: balance.result[0], high: balance.result[1] });
      } catch (e) {
        console.error(e);
      }
    },
    {
      enabled: !!starknet?.provider && !!account,
      refetchInterval: 300e3,
    }
  );
}

export default useEthBalance;