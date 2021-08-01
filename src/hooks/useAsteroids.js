import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAsteroids = () => {
  const { account } = useWeb3React();
  const includeOwnedAsteroids = useStore(state => state.includeOwned);
  const [ query, setQuery ] = useState({});

  useEffect(() => {
    if (account && includeOwnedAsteroids) {
      setQuery({ ...query, includeOwned: account });
    } else {
      const { includeOwned, ...newQuery } = query;
      setQuery(newQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ account, includeOwnedAsteroids ]);

  return useQuery([ 'asteroids', query ], () => api.getAsteroids(query));
};

export default useAsteroids;
