import { useEffect, useState } from '~/lib/react-debug';

import useStore from '~/hooks/useStore';
import useAssetSearch from './useAssetSearch';

const pageSize = 25;

const usePagedAssets = (assetType) => {
  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch[assetType].filters || {});
  const sort = useStore(s => s.assetSearch[assetType].sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  useEffect(import.meta.url, () => {
    setPage(1);
  }, [filters, sort]);

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: useAssetSearch(assetType, { from: (page - 1) * pageSize, size: pageSize })
  };
};

export default usePagedAssets;
