import esb from 'elastic-builder';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import { useMemo } from 'react';

const useWalletShips = () => {
  const { accountAddress } = useSession();
  const { crews, loading: crewsLoading } = useCrewContext();

  const query = useMemo(() => {
    if (!accountAddress || crewsLoading) return null;

    try {
      const qb = esb.boolQuery();
      qb.should([
        esb.termQuery('Nft.owner', accountAddress),
        esb.termsQuery('Control.controller.id', (crews || []).map((c) => c.id)),
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
  }, [accountAddress, crews, crewsLoading]);

  return useQuery(
    [ 'search', 'ships', query ],
    () => api.searchAssets('ships', query),
    { enabled: !!query }
  );

  // TODO: 
  // update useOwnedShips to use this
  // update useControlledShips (per crew) to use this
};

export default useWalletShips;