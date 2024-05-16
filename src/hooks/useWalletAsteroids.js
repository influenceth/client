import esb from 'elastic-builder';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';

const useWalletAsteroids = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const query = useMemo(() => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.should([
        esb.termQuery('Nft.owner', accountAddress),
        esb.termsQuery('Control.controller.id', (crews || []).map((c) => c.id)),
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
  }, [accountAddress, crews, crewsLoading]);

  return useQuery(
    [ 'search', 'asteroids', query ],
    () => api.searchAssets('asteroids', query),
    { enabled: !!query }
  );

  // TODO: 
  // update useOwnedAsteroids to use this
  // update useControlledAsteroids (per crew) to use this
};

export default useWalletAsteroids;