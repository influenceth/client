import esb from 'elastic-builder';
import { Building, Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { entitiesCacheKey } from '~/lib/cacheKey';

const statuses = [
  Building.CONSTRUCTION_STATUSES.PLANNED,
  Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION,
  Building.CONSTRUCTION_STATUSES.OPERATIONAL,
];

const useWalletBuildings = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const controllerIds = useMemo(() => (crews || []).map((c) => c.id), [crews]);

  const query = useMemo(() => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.filter(esb.termsQuery('Control.controller.id', controllerIds));
      qb.mustNot(esb.termQuery('Building.status', Building.CONSTRUCTION_STATUSES.UNPLANNED));
      
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
  }, [accountAddress, controllerIds, crewsLoading]);

  return useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { controllerId: controllerIds, status: statuses }),
    () => api.searchAssets('buildings', query),
    { enabled: !!query }
  );
};

export default useWalletBuildings;