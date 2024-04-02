import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroidCrewBuildings = (asteroidId, explicitCrewId) => {
  const { crew } = useCrewContext();
  const controllerId = explicitCrewId || crew?.id;
  return useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, controllerId }),
    () => api.getCrewBuildingsOnAsteroid(asteroidId, controllerId),
    { enabled: !!(asteroidId && controllerId) }
  );
};

export default useAsteroidCrewBuildings;
