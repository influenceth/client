import { useQuery } from 'react-query';
import { Entity, Ship } from '@influenceth/sdk';

import api from '~/lib/api';

const useAsteroidShips = (asteroidId) => {
  return useQuery(
    [ 'entities', Entity.IDS.SHIP, { asteroidId, status: Ship.STATUSES.AVAILABLE } ],
    () => api.getAsteroidShips(asteroidId),
    { enabled: !!asteroidId }
  );
};

export default useAsteroidShips;
