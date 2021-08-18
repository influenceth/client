import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';

const useMintableCrew = () => {
  const { account } = useWeb3React();

  return useQuery(
    [ 'mintableCrew', { owner: account } ],
    () => api.getMintableCrew({ owner: account }),
    { enabled: !!account, staleTime: 60000 * 5 }
  );
};

export default useMintableCrew;
