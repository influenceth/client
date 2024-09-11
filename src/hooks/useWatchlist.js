import { useMemo } from '~/lib/react-debug';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useSession from '~/hooks/useSession';

const useWatchlist = () => {
  const { token } = useSession();

  const watchlist = useQuery(
    [ 'watchlist', token ],
    async () => {
      const list = (await api.getWatchlist()) || [];
      return await api.getEntities({ ids: list.map(w => w.asteroid), label: Entity.IDS.ASTEROID });
    },
    { enabled: !!token }
  );

  const ids = useMemo(import.meta.url, () => {
    if (watchlist.data) return watchlist.data.map(w => w.id);
    return [];
  }, [watchlist.data, watchlist.dataUpdatedAt]);

  return { watchlist, ids };
};

export default useWatchlist;
