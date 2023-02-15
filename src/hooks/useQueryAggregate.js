import { useMemo } from "react";
import { useIsFetching } from "react-query";

const aggAnd = (key, queryResponse, queriesResponses) => {
  return [queryResponse, ...queriesResponses].reduce((acc, cur) => acc && cur[key], true);
};
const aggOr = (key, queryResponse, queriesResponses) => {
  return [queryResponse, ...queriesResponses].reduce((acc, cur) => acc || cur[key], false);
};

// combine aggregate responses to simulate a single useQuery response
const useQueryAggregate = (queryResponse, queriesResponses, watchQueryKey1, watchQueryKey2) => {
  const isFetching1 = useIsFetching(watchQueryKey1 ? { queryKey: watchQueryKey1 } : undefined);
  const isFetching2 = useIsFetching(watchQueryKey2 ? { queryKey: watchQueryKey2 } : undefined);
  
  // have to watch this so also catch updates-in-place where no new fetching is actually done
  const lastSubqueriesUpdatedAt = useMemo(() => {
    return queriesResponses.reduce((acc, r) => r.dataUpdatedAt > acc ? r.dataUpdatedAt : acc, 0);
  }, [queriesResponses]);

  return useMemo(() => ({
    // always combined from sub-queries
    data: queriesResponses.map((r) => r.data),
    dataUpdatedAt: lastSubqueriesUpdatedAt,

    // always top-level query
    error: queryResponse.error,
    errorUpdatedAt: queryResponse.errorUpdatedAt,
    failureCount: queryResponse.failureCount,
    refetch: queryResponse.refetch,
    remove: queryResponse.remove,
    status: queryResponse.status,
    
    // and
    isFetched: aggAnd('isFetched', queryResponse, queriesResponses),
    isFetchedAfterMount: aggAnd('isFetchedAfterMount', queryResponse, queriesResponses),
    isIdle: aggAnd('isIdle', queryResponse, queriesResponses),
    isSuccess: aggAnd('isSuccess', queryResponse, queriesResponses),

    // or
    isError: aggOr('isError', queryResponse, queriesResponses),
    isFetching: aggOr('isFetching', queryResponse, queriesResponses),
    isLoading: aggOr('isLoading', queryResponse, queriesResponses),
    isLoadingError: aggOr('isLoadingError', queryResponse, queriesResponses),
    isPlaceholderData: aggOr('isPlaceholderData', queryResponse, queriesResponses),
    isPreviousData: aggOr('isPreviousData', queryResponse, queriesResponses),
    isRefetchError: aggOr('isRefetchError', queryResponse, queriesResponses),
    isRefetching: aggOr('isRefetching', queryResponse, queriesResponses),
    isStale: aggOr('isStale', queryResponse, queriesResponses),
  }), [isFetching1, isFetching2, lastSubqueriesUpdatedAt]);
}

export default useQueryAggregate;