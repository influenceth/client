import { useEffect, useMemo, useState } from 'react';
import get from 'lodash/get';
import { Entity, Permission } from '@influenceth/sdk';

import useCrewAgreements from '~/hooks/useCrewAgreements';
import useEntity from '~/hooks/useEntity';
import useStore from '~/hooks/useStore';
import { entityToAgreements } from '~/lib/utils';

const assetType = 'agreements';
const pageSize = 25;

const usePagedAgreements = (params) => {
  const [page, setPage] = useState(1);

  const filters = useStore(s => s.assetSearch[assetType]?.filters);
  const sort = useStore(s => s.assetSearch[assetType]?.sort);
  const setSort = useStore(s => s.dispatchSortUpdated(assetType));

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  // get data for crewAgreements or entityAgreements, depending on if uuid is specified or not
  const { data: crewAgreements, isLoading: crewAgreementsLoading } = useCrewAgreements(undefined, !params.uuid);
  const { data: entity, isLoading: entityLoading } = useEntity(params.uuid ? Entity.unpackEntity(params.uuid) : null);

  const isLoading = crewAgreementsLoading || entityLoading;

  const data = useMemo(() => {
    if (isLoading) return undefined;
    if (crewAgreements) return crewAgreements;
    if (entity) return entityToAgreements(entity).filter((a) => !params.permission || (a._agreement.permission === Number(params.permission)));
    return [];
  }, [crewAgreements, entity, isLoading, params.permission]);

  const filteredData = useMemo(() => {
    return (data || [])
      .filter(() => true)
      .sort((a, b) => (sort[1] === 'asc' ? 1 : -1) * (get(a, sort[0]) < get(b, sort[0]) ? -1 : 1));
  }, [data, sort, filters]);

  const dataPage = useMemo(() => filteredData.slice(pageSize * (page - 1), pageSize * page), [filteredData, page])

  return {
    page,
    perPage: pageSize,
    setPage,
    sort,
    setSort,
    query: {
      data: {
        hits: dataPage,
        total: filteredData?.length
      },
      isLoading
    }
  };
};

export default usePagedAgreements;
