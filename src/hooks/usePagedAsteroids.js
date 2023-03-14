import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useAsteroidSearch from './useAsteroidSearch';

const pageSize = 25;

const usePagedAsteroids = () => {
  const [page, setPage] = useState(1);

  const filters = useStore(s => s.asteroids.filters);
  const sort = useStore(s => s.asteroids.sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated);

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
