import { useMemo } from 'react';
import { useQuery } from 'react-query';
import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';

const useWatchlist = () => {
  const { token } = useAuth();

  const watchlist = useQuery(
    [ 'watchlist', token ],
    api.getWatchlist,
    { enabled: !!token }
  );

  const ids = useMemo(() => {
    if (watchlist.data) {
      return watchlist.data.map(w => w.asteroid.i);
    }
    return [];
  }, [watchlist.data]);

  return { watchlist, ids };
};

export default useWatchlist;
