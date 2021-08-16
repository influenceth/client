import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';

const baseQuery = { hydrated: true };

const useOwnedAsteroids = () => {
  const { account } = useWeb3React();

  return useQuery(
    [ 'asteroids', {...baseQuery, ownedBy: account } ],
    () => api.getAsteroids({...baseQuery, ownedBy: account }),
    { enabled: !!account, staleTime: 60000 * 5 }
  );
};

export default useOwnedAsteroids;
