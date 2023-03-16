import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useAsteroidSearch from './useAsteroidSearch';

const pageSize = 25;

const usePagedAsteroids = () => {
  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch.asteroids.filters);
  const sort = useStore(s => s.assetSearch.asteroids.sort);
  const setSort = useStore(s => s.dispatchSortUpdated('asteroids'));

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: useAsteroidSearch({ from: (page - 1) * pageSize, size: pageSize })
  };
};

export default usePagedAsteroids;
