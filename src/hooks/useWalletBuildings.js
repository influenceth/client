import esb from 'elastic-builder';
import { Building, Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { entitiesCacheKey } from '~/lib/cacheKey';

export const statuses = [
  Building.CONSTRUCTION_STATUSES.PLANNED,
  Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION,
  Building.CONSTRUCTION_STATUSES.OPERATIONAL,
];

const useWalletBuildings = (includeRecoverables) => {
  const { accountAddress } = useSession();
  const { accountCrewIds, loading: crewsLoading } = useCrewContext();

  const query = useMemo(() => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.filter(esb.termsQuery('Control.controller.id', accountCrewIds));
      
      const q = esb.requestBodySearch();
      q.query(qb);
      q.from(0);
      q.size(10000);
      q.trackTotalHits(true);

      return q.toJSON();
    } catch (e) {
      console.error(e);
    }

    return null;
  }, [accountAddress, accountCrewIds, crewsLoading]);

  const queryResponse = useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { controllerId: accountCrewIds, status: statuses }),
    async () => {
      const response = await api.searchAssets('buildings', query);
      return response?.hits || [];
    },
    { enabled: !!query }
  );

  return useMemo(() => ({
    ...queryResponse,
    data: (queryResponse.data || []).filter((building) => (
      building.Building.status !== Building.CONSTRUCTION_STATUSES.UNPLANNED
      || (includeRecoverables && !!building.Inventories.find((i) => i.mass || i.reservedMass))
    ))
  }), [queryResponse?.dataUpdatedAt, includeRecoverables])
};

export default useWalletBuildings;