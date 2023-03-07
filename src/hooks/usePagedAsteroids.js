import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const usePagedAsteroids = () => {
  const { account } = useAuth();
  const filterOwned = useStore(s => s.asteroids.owned.filtered);
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
    if (!!account && filterOwned) newParams.filterOwned = true;
    if (!!account && filterWatched) newParams.filterWatched = true;
    setParams(newParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ account, filterOwned, filterWatched, filters ]);

  const query = useQuery(
    [ 'asteroids', 'list', params ],
    () => api.getAsteroids(params),
    { keepPreviousData: true }
  );

  return { query, setPage, setPerPage, setSort };
};

export default usePagedAsteroids;
