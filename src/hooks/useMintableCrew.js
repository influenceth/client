import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useSale from '~/hooks/useSale';

const useMintableCrew = () => {
  const { account } = useWeb3React();
  const { data: sale } = useSale();

  return useQuery(
    [ 'asteroids', 'mintableCrew', { owner: account } ],
    () => api.getMintableCrew({ owner: account }),
    { enabled: !!account && !!sale && !!sale.endCount }
  );
};

export default useMintableCrew;
