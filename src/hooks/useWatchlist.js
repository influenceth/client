import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useWatchlist = () => {
  const { token } = useAuth();

  const watchlist = useQuery(
    [ 'watchlist', token ],
    async () => {
      const list = await api.getWatchlist();
      return await api.getEntities({ ids: list.map(w => w.asteroid.i), label: Entity.IDS.ASTEROID });
    },
    { enabled: !!token }
  );

  const ids = useMemo(() => {
    if (watchlist.data) {
      return watchlist.data.map(w => w.asteroid);
    }
    return [];
  }, [watchlist.data]);

  return { watchlist, ids };
};

export default useWatchlist;
