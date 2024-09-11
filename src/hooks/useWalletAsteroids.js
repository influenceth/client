import { useMemo } from '~/lib/react-debug';
import { useQuery } from 'react-query';
import esb from 'elastic-builder';
import { Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useWalletAsteroids = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const controllerIds = useMemo(import.meta.url, () => (crews || []).map((c) => c.id), [crews]);

  const query = useMemo(import.meta.url, () => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.should([
        esb.termQuery('Nft.owner', accountAddress),
        esb.termsQuery('Control.controller.id', controllerIds),
        // esb.termsQuery('id', [1,12,123,1234,1234,12345,123456])  // TODO: remove this debug line
      ]);
      
      const q = esb.requestBodySearch();
      q.query(qb);
      q.source({ excludes: [ 'AsteroidProof' ]});
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
    entitiesCacheKey(Entity.IDS.ASTEROID, { owner: accountAddress, controllerId: controllerIds }),
    async () => {
      const response = await api.searchAssets('asteroids', query);
      return response?.hits || [];
    },
    { enabled: !!query }
  );
};

export default useWalletAsteroids;