import { useCallback, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import useEntity from '~/hooks/useEntity';

const assetType = 'agreements';

const usePagedAgreements = ({ uuid, permission }) => {
  const { data: entity, isLoading } = useEntity(Entity.unpackEntity(uuid));
  const policy = useMemo(() => entity && permission ? Permission.getPolicyDetails(entity)[permission] : {}, [entity, permission]);
  const rawData = useMemo(() => policy?.agreements || [], [policy?.agreements]);

  const page = 1;
  const perPage = rawData.length;

  const filters = useStore(s => s.assetSearch[assetType].filters || {});
  const sort = useStore(s => s.assetSearch[assetType].sort || []);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  const hits = useMemo(() => {
    return rawData.map((d) => ({
      ...d,
      entity,
      key: `${d.permission}.${Entity.packEntity(d.permitted)}`,
    }));
  }, [entity, rawData, filters, sort]);

  return {
    disablePagination: true,
    page,
    perPage,
    setPage: useCallback(() => {}, []),
    sort,
    setSort,
    query: { data: { hits, total: hits.length }, isLoading }
  };
};

export default usePagedAgreements;
