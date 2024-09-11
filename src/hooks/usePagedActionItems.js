import { useContext, useEffect, useMemo, useState } from '~/lib/react-debug';

import ActionItemContext from '~/contexts/ActionItemContext';
import { formatActionItem } from '~/lib/actionItem';
import useStore from './useStore';
import useGetActivityConfig from './useGetActivityConfig';

const assetType = 'actionitems';
const pageSize = 25;

const typeOrder = ['pending', 'failed', 'ready', 'unready', 'plan', 'agreement'];

const usePagedActionItems = () => {
  const getActivityConfig = useGetActivityConfig();

  const {
    allVisibleItems: allItems,
    isLoading
  } = useContext(ActionItemContext);

  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch[assetType].filters || {});
  const sort = useStore(s => s.assetSearch[assetType].sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  useEffect(import.meta.url, () => {
    setPage(1);
  }, [filters, sort]);

  const { hits, total } = useMemo(import.meta.url, () => {
    const filteredItems = allItems
      .map((item) => formatActionItem(item, getActivityConfig(item)?.actionItem))
      .filter((item) => {
        if (!filters?.asteroid || item.asteroidId === Number(filters.asteroid)) {
          if (!filters?.status || filters.status.includes(item.type)) {
            return true;
          }
        }
        return false;
      });
    return {
      hits: filteredItems
        .sort((a, b) => {
          if (sort[0] === 'time') {
            let which = 0;
            if (a.type === b.type) {
              which = (a.finishTime || a._timestamp) < (b.finishTime || b._timestamp) ? -1 : 1;
            } else {
              which = typeOrder.indexOf(a.type) < typeOrder.indexOf(b.type) ? -1 : 1;
            }
            return (sort[1] === 'asc' ? 1 : -1) * which;
          }
          return (sort[1] === 'asc' ? 1 : -1) * (a[sort[0]] < b[sort[0]] ? -1 : 1)
        })
        .slice((page - 1) * pageSize, page * pageSize),
      total: filteredItems.length
    }
  }, [allItems, filters, getActivityConfig, page, sort]);  

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: {
      data: { hits, total },
      isLoading
    }
  };
};

export default usePagedActionItems;
