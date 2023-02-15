import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from 'react-query';
import api from '~/lib/api';

import useAuth from '~/hooks/useAuth';
import { getQuery } from './useAsteroid';
import useQueryAggregate from './useQueryAggregate';

// NOTE: this uses a customized version of useAsteroidAggregate because
// the endpoint does not just return asteroids AND the output has to include
// that additional info BUT we still want the referenced asteroid records
// to be kept up to date automatically from the cache

const useWatchlist = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState([]);
  
  const { data: watchlistItems, ...prepResponse } = useQuery(
    [ 'watchlist', token ],
    () => api.getWatchlist(),
    { enabled: !!token }
  );

  useEffect(() => {
    setQueries(
      (watchlistItems || []).map(({ asteroid }) => {
        const q = getQuery(asteroid.i);
        queryClient.setQueryData(q.queryKey, asteroid);
        return q;
      })
    )
  }, [watchlistItems]);

  // actually use an aggregation of individually cached values
  const combinedResponse = useQueryAggregate(prepResponse, useQueries(queries || []), ['watchlist', token ], ['asteroid']);
    
  // transformed response
  return useMemo(() => ({
    ...combinedResponse,
    data: (watchlistItems || []).map((watchlistItem) => {
      const upToDateAsteroid = (combinedResponse.data || []).find((a) => a.i === watchlistItem.asteroid.i);
      if (upToDateAsteroid) {
        return {
          ...watchlistItem,
          asteroid: upToDateAsteroid
        };
      }
      return watchlistItem;
    })
  }), [combinedResponse, watchlistItems]);
};

export default useWatchlist;
