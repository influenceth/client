import { useQuery } from 'react-query';
import { Entity, Ship } from '@influenceth/sdk';

import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroidShips = (asteroidId) => {
  return useQuery(
    entitiesCacheKey(Entity.IDS.SHIP, { asteroidId: Number(asteroidId), status: Ship.STATUSES.AVAILABLE }),
    () => api.getAsteroidShips(asteroidId),
    { enabled: !!asteroidId }
  );
};

export default useAsteroidShips;
