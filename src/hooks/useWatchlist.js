import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';

const useWatchlist = () => {
  const { token } = useAuth();
  const [ ids, setIds ] = useState([]);

  const watchlist = useQuery(
    [ 'watchlist', token ],
    api.getWatchlist,
    { enabled: !!token }
  );

  useEffect(() => {
    if (watchlist.data) {
      setIds(watchlist.data.map(w => w.asteroid.i));
    } else {
      setIds([]);
    }
  }, [ watchlist.data ]);

  return { watchlist, ids };
};

export default useWatchlist;
