import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const usePagedAsteroids = () => {
  const { account } = useWeb3React();
  const includeOwned = useStore(s => s.asteroids.owned.mapped);
  const filterOwned = useStore(s => s.asteroids.owned.filtered);
  const includeWatched = useStore(s => s.asteroids.watched.mapped);
  const filterWatched = useStore(s => s.asteroids.watched.filtered);
  const filters = useStore(s => s.asteroids.filters);
  const [ params, setParams ] = useState({ page: 1, perPage: 25 });

  const setPage = (page) => {
    const newParams = Object.assign({}, params, { page });
    setParams(newParams);
  };

  const setPerPage = (perPage) => {
    const newParams = Object.assign({}, params, { perPage });
    setParams(newParams);
  };

  const setSort = (sort) => {
    const newParams = Object.assign({}, params, { sort });
    setParams(newParams);
  };

  useEffect(() => {
    const { page, perPage, sort } = params;
    const newParams = Object.assign({}, filters);
    newParams.page = page || 1;
    newParams.perPage = perPage || 25;
    if (sort) newParams.sort = sort;
    if (!!account && includeOwned) newParams.includeOwned = account;
    if (!!account && includeWatched) newParams.includeWatched = true;
    if (!!account && filterOwned) newParams.filterOwned = true;
    if (!!account && filterWatched) newParams.filterWatched = true;
    setParams(newParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ account, includeOwned, includeWatched, filterOwned, filterWatched, filters ]);

  const query = useQuery(
    [ 'asteroids', 'search', params ],
    () => api.getAsteroids(params),
    { keepPreviousData: true }
  );

  return { query, setPage, setPerPage, setSort };
};

export default usePagedAsteroids;
