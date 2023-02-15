import { useQuery, useQueries, useQueryClient } from 'react-query';

import api from '~/lib/api';
import useQueryAggregate from './useQueryAggregate';

export const getQuery = (i) => ({
  queryKey: [ 'crewmember', i ],
  queryFn: () => api.getCrewMember(i),
  enabled: !!i
});

const useCrewMember = (i) => {
  const { queryKey, queryFn, ...options } = getQuery(i);
  return useQuery(queryKey, queryFn, options);
};

export const useCrewMemberAggregate = (aggregateKey, aggregateFn, options = {}) => {
  const queryClient = useQueryClient();

  const { data: queries, ...prepResponse } = useQuery(
    aggregateKey,
    () => new Promise((resolve, reject) => {
      aggregateFn()
        .then((crewMembers) => {
          resolve(
            crewMembers.map((crewMember) => {
              const q = getQuery(crewMember.i);
              queryClient.setQueryData(q.queryKey, crewMember);
              return q;
            })
          );
        })
        .catch(reject);
    }),
    options
  );

  // actually use an aggregation of individually cached values
  return useQueryAggregate(prepResponse, useQueries(queries || []), aggregateKey, ['crewmember']);
};

export default useCrewMember;
