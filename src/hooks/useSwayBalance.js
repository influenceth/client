import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useAuth from './useAuth';

const useSwayBalance = (overrideAccount) => {
  const { account: defaultAccount, walletContext: { starknet } } = useAuth();
  const account = overrideAccount || defaultAccount;

  return useQuery(
    [ 'swayBalance', account ],
    async () => {
      try {
        const balance = await starknet.account.provider.callContract({
          contractAddress: process.env.REACT_APP_STARKNET_SWAY_TOKEN,
          entrypoint: 'balanceOf',
          calldata: [account]
        });
        const unscaledSway = uint256.uint256ToBN({ low: balance.result[0], high: balance.result[1] });
        return unscaledSway / 1000000n;
      } catch (e) {
        console.error(e);
      }
    },
    {
      enabled: !!starknet?.account?.provider && !!account,
      refetchInterval: 300e3,
    }
  );
}

export default useSwayBalance;