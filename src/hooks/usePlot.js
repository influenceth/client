import { useQueries, useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';
import useQueryAggregate from './useQueryAggregate';

const getQuery = ({ asteroidId, plotId }) => ({
  queryKey: [ 'plot', asteroidId, plotId ],
  queryFn: () => api.getPlot(asteroidId, plotId),
  enabled: !!(asteroidId && plotId)
});

export const usePlot = (asteroidId, plotId) => {
  const { queryKey, queryFn, ...options } = getQuery({ asteroidId, plotId });
  return useQuery(queryKey, queryFn, options);
};

export const usePlotAggregate = (aggregateKey, aggregateFn, options = {}) => {
  const queryClient = useQueryClient();

  const { data: queries, ...prepResponse } = useQuery(
    aggregateKey,
    () => new Promise((resolve, reject) => {
      aggregateFn()
        .then((plots) => {
          resolve(
            plots.map((plot) => {
              const q = getQuery({ asteroidId: plot.asteroid, plotId: plot.i });
              queryClient.setQueryData(q.queryKey, plot);
              return q;
            })
          )
        })
        .catch(reject);
    }),
    options
  );

  // actually use an aggregation of individually cached values
  return useQueryAggregate(prepResponse, useQueries(queries || []), aggregateKey, ['plot']);
};

export default usePlot;
