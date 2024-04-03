import { useMemo } from 'react';

import useEarliestActivity from '~/hooks/useEarliestActivity';
import api from '~/lib/api';
import { useQuery } from 'react-query';
import useEntity from './useEntity';

const useAnnotations = (activity) => {
  const query = useMemo(
    () => activity?.event ? { transactionHash: activity?.event?.transactionHash, logIndex: activity?.event?.logIndex } : null,
    [activity]
  );
  
  return useQuery(
    ['annotations', query],
    () => api.getAnnotations(query),
    { enabled: !!query }
  );
};

// description is most-recent annotation on earliest event (by controlling crew if any exist)
export const useDescriptionAnnotation = (entityId) => {
  const { data: earliest, isLoading: activityIsLoading } = useEarliestActivity(entityId);
  const { data: entity, isLoading: entityIsLoading } = useEntity(entityId);
  const { data: annotations, isLoading } = useAnnotations(earliest);
  
  return useMemo(() => {
    if (isLoading || activityIsLoading || entityIsLoading) return { data: undefined, isLoading: true };
    const preferred = annotations?.filter((a) => a.crewId === entity?.Control?.controller?.id);
    return {
      data: (preferred?.length ? preferred : [...(annotations || [])]).sort((a, b) => a.createdAt < b.createdAt ? -1 : 1)[0]?.ipfs?.hash,
      isLoading: false
    };
  }, [annotations, isLoading, activityIsLoading, entityIsLoading])
}

export default useAnnotations;
