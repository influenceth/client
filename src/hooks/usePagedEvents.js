import { useContext, useEffect, useState } from 'react';

import EventsContext from '~/contexts/EventsContext';
import useStore from './useStore';

const assetType = 'eventlog';
const pageSize = 50;

const usePagedEvents = () => {
  const e = useContext(EventsContext);

  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch[assetType].filters || {});
  const sort = useStore(s => s.assetSearch[assetType].sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: {
      data: [],
      isLoading: false,
    }
  };
};

export default usePagedEvents;
