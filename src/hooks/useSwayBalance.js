import { useQuery } from 'react-query';
import { uint256 } from 'starknet';

import useSession from './useSession';

const useSwayBalance = (overrideAccount) => {
  const { accountAddress: defaultAccount, starknet } = useSession();

  const accountAddress = overrideAccount || defaultAccount;
  return useQuery(
    [ 'swayBalance', accountAddress ],
    async () => {
      try {
        const balance = await starknet.provider.callContract({
          contractAddress: process.env.REACT_APP_STARKNET_SWAY_TOKEN,
          entrypoint: 'balanceOf',
          calldata: [accountAddress]
        });
        const unscaledSway = uint256.uint256ToBN({ low: balance?.[0], high: balance?.[1] });
        return unscaledSway / 1000000n;
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

export default useSwayBalance;