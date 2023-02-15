import { useMemo } from 'react';
import { useQueries, useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';
import useQueryAggregate from './useQueryAggregate';

export const getQuery = (asteroidId, extended = false) => ({
  queryKey: [ 'asteroid', asteroidId, ...(extended ? [true] : [])],
  queryFn: () => api.getAsteroid(asteroidId, extended),
  enabled: !!asteroidId
});

// TODO: should extended version be same data? should be rare to use, so probably not big deal
export const useAsteroid = (asteroidId, extended = false) => {
  const { queryKey, queryFn, ...options } = getQuery(asteroidId, extended);
  return useQuery(queryKey, queryFn, options);
};

export const useAsteroidAggregate = (aggregateKey, aggregateFn, options = {}) => {
  const queryClient = useQueryClient();

  const { data: queries, ...prepResponse } = useQuery(
    aggregateKey,
    () => new Promise((resolve, reject) => {
      aggregateFn()
        .then((asteroids) => {
          resolve(
            asteroids.map((asteroid) => {
              const q = getQuery(asteroid.i);
              queryClient.setQueryData(q.queryKey, asteroid);
              return q;
            })
          );
        })
        .catch(reject);
    }),
    options
  );

  // actually use an aggregation of individually cached values
  return useQueryAggregate(prepResponse, useQueries(queries || []), aggregateKey, ['asteroid']);
};

export default useAsteroid;
