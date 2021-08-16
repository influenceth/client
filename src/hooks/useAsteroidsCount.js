import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAsteroidsCount = () => {
  const { account } = useWeb3React();
  const includeOwned = useStore(s => s.asteroids.owned.mapped);
  const filterOwned = useStore(s => s.asteroids.owned.filtered);
  const includeWatched = useStore(s => s.asteroids.watched.mapped);
  const filterWatched = useStore(s => s.asteroids.watched.filtered);
  const filters = useStore(s => s.asteroids.filters);
  const [ query, setQuery ] = useState({ count: true });

  useEffect(() => {
    const newQuery = Object.assign({ count: true }, filters);
    if (!!account && includeOwned) newQuery.includeOwned = account;
    if (!!account && includeWatched) newQuery.includeWatched = true;
    if (!!account && filterOwned) newQuery.filterOwned = true;
    if (!!account && filterWatched) newQuery.filterWatched = true;
    setQuery(newQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ account, includeOwned, includeWatched, filterOwned, filterWatched, filters ]);

  return useQuery(
    [ 'asteroidsCount', query ],
    () => api.getAsteroids(query),
    { keepPreviousData: true,  staleTime: 60000 * 5 }
  );
};

export default useAsteroidsCount;
