import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroids = (ids) => {
  return useQuery(
    entitiesCacheKey(Entity.IDS.ASTEROID, ids.join(',')), // TODO: joined key
    async () => {
      const asteroids = await api.getAsteroids(ids);
      return ids.map((id) => asteroids.find((c) => c.id === id)); // sort by order of ids
    },
    { enabled: ids?.length > 0 }
  );
};

export default useAsteroids;
