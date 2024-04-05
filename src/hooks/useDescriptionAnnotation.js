import { useMemo } from 'react';

import useEarliestActivity from '~/hooks/useEarliestActivity';
import useEntity from '~/hooks/useEntity';

// (earliest annotations don't always have createdAt)
const fallbackTime = '2000-01-01T00:00:00.000Z';

// description is most-recent annotation on earliest event (by controlling crew if any exist)
const useDescriptionAnnotation = (entityId) => {
  const { data: earliest, isLoading: activityIsLoading } = useEarliestActivity(entityId);
  const { data: entity, isLoading: entityIsLoading } = useEntity(entityId);
  
  return useMemo(() => {
    if (activityIsLoading || entityIsLoading) return { data: undefined, isLoading: true };
    const annotations = earliest?._virtuals?.eventAnnotations || [];
    const preferred = annotations?.filter((a) => a.crew === entity?.Control?.controller?.id);
    const sorted = (preferred?.length ? preferred : [...annotations])
      .sort((a, b) => (a.createdAt || fallbackTime) > (b.createdAt || fallbackTime) ? -1 : 1);
    return {
      data: sorted[0],
      isLoading: false
    };
  }, [earliest, activityIsLoading, entityIsLoading])
};

export default useDescriptionAnnotation;
