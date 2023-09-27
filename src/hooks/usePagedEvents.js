import { useEffect, useState } from 'react';

import api from '~/lib/api';
import getLogContent, { types } from '~/lib/getLogContent';
import useStore from './useStore';

const assetType = 'eventlog';
const pageSize = 25;

const usePagedEvents = () => {
  const [data, setData] = useState({ hits: [], total: 0 });
  const [loading, setLoading] = useState();
  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch[assetType].filters || {});
  const sort = useStore(s => s.assetSearch[assetType].sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);
  
  useEffect(() => {
    setLoading(true);

    // TODO (enhancement): if not using any filters, should probably use react-query here...
    //  but will need to invalidate these queries when get event updates from WS

    api.getActivities({ page, pageSize, types, returnTotal: true })
      .then(({ events, totalHits }) => {
        setData({
          hits: events.map((e) => ({
            ...getLogContent({ type: e.event, data: e }),
            e
          })),
          total: totalHits
        });
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
  }, [filters, sort, page]);

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: {
      data: data,
      isLoading: loading,
    }
  };
};

export default usePagedEvents;
