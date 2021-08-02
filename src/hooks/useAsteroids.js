import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAsteroids = () => {
  const { account } = useWeb3React();
  const includeOwned = useStore(state => state.asteroids.owned.mapped);
  const filterOwned = useStore(state => state.asteroids.owned.filtered);
  const includeWatchlist = useStore(state => state.asteroids.watched.mapped);
  const filiterWatchlist = useStore(state => state.asteroids.watched.filtered);
  const filters = useStore(state => state.asteroids.filters);
  const [ query, setQuery ] = useState({});

  useEffect(() => {
    const newQuery = Object.assign({}, filters);

    if (!!account && includeOwned) newQuery.includeOwned = account;
    setQuery(newQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ account, includeOwned, includeWatchlist, filters ]);

  return useQuery([ 'asteroids', query ], () => api.getAsteroids(query), { keepPreviousData: true });
};

export default useAsteroids;
