import esb from 'elastic-builder';
import { Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { entitiesCacheKey } from '~/lib/cacheKey';

// TODO: should we filter out disabled ships? not a thing yet
//  what about under_construction ships?

const useWalletShips = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const controllerIds = useMemo(() => (crews || []).map((c) => c.id), [crews]);

  const query = useMemo(() => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.should([
        esb.termQuery('Nft.owner', accountAddress),
        esb.termsQuery('Control.controller.id', controllerIds),
      ]);
      
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
    entitiesCacheKey(Entity.IDS.SHIP, { owner: accountAddress, controllerId: controllerIds }),
    () => api.searchAssets('ships', query),
    { enabled: !!query }
  );
};

export default useWalletShips;