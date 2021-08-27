import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAsteroids = () => {
  const { account } = useWeb3React();
  const includeOwned = useStore(s => s.asteroids.owned.mapped);
  const filterOwned = useStore(s => s.asteroids.owned.filtered);
  const includeWatched = useStore(s => s.asteroids.watched.mapped);
  const filterWatched = useStore(s => s.asteroids.watched.filtered);
  const filters = useStore(s => s.asteroids.filters);
  const highlight = useStore(s => s.asteroids.highlight);
  const [ query, setQuery ] = useState({});

  useEffect(() => {
    const newQuery = Object.assign({}, filters);
    if (!!account && includeOwned) newQuery.includeOwned = account;
    if (!!account && includeWatched) newQuery.includeWatched = true;
    if (!!account && filterOwned) newQuery.filterOwned = true;
    if (!!account && filterWatched) newQuery.filterWatched = true;
    if (!!highlight) newQuery.highlight = highlight.field;
    setQuery(newQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ account, includeOwned, includeWatched, filterOwned, filterWatched, filters, highlight ]);

  return useQuery(
    [ 'asteroids', query ],
    () => api.getAsteroids(query),
    { keepPreviousData: true }
  );
};

export default useAsteroids;
