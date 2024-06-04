import { useMemo } from 'react';
import { useQuery } from 'react-query';

import useSession from '~/hooks/useSession';

const useAccountFormatted = (props) => {
  const { address, doNotReplaceYou, truncate, doNotUseName } = props;
  const { accountAddress, provider } = useSession();

  // const { data: starkName } = useQuery(
  //   [ 'starkName', address ],
  //   async () => {
  //     return await provider.getStarkName(address);
  //   },
  //   { enabled: !!address }
  // );

  const label = useMemo(() => {
    return (accountAddress && accountAddress === address && !doNotReplaceYou)
      ? 'you'
      : (
        address && truncate
        ? `${address.substr(0, 6)}...${address.substr(-4)}`
        : address
      );
  }, [accountAddress, address, doNotReplaceYou, truncate, provider]);

  return useMemo(() => {
    if (!address) return null;
    return label;
  }, [label, doNotUseName]);
};

export default useAccountFormatted;