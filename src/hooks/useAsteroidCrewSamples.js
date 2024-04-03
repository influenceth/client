import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrewContext();

  const controllerId = crew?.id;
  return useQuery(
    entitiesCacheKey(Entity.IDS.DEPOSIT, { asteroidId, resourceId, controllerId, isDepleted: false }),
    () => api.getCrewSamplesOnAsteroid(asteroidId, controllerId, resourceId),
    { enabled: !!(asteroidId && controllerId && resourceId) }
  );
};

export default useAsteroidCrewSamples;
