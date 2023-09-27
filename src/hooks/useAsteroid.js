import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useAsteroid = (id) => {
  return useQuery(
    [ 'entity', Entity.IDS.ASTEROID, id ],
    () => api.getAsteroid(id),
    { enabled: !!id }
  );
};

export default useAsteroid;
