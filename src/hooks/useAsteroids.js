import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useAsteroids = (ids) => {
  return useQuery(
    [ 'entities', Entity.IDS.ASTEROID, ids.join(',') ], // TODO: joined key
    async () => {
      const asteroids = await api.getAsteroids(ids);
      return ids.map((id) => asteroids.find((c) => c.id === id));
    },
    { enabled: ids?.length > 0 }
  );
};

export default useAsteroids;
