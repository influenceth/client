import esb from 'elastic-builder';
import { Building } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';

const useWalletBuildings = () => {
  const { crews, loading: crewsLoading } = useCrewContext();

  const query = useMemo(() => {
    if (crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.filter(esb.termsQuery('Control.controller.id', (crews || []).map((c) => c.id)));
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
  }, [crews, crewsLoading]);

  return useQuery(
    [ 'search', 'buildings', query ],
    () => api.searchAssets('buildings', query),
    { enabled: !!query }
  );

  // TODO: 
  // update useBuildings? to use this
};

export default useWalletBuildings;