import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useAsteroidShips = (i) => {
  return useQuery(
    [ 'entities', Entity.IDS.SHIP, 'asteroid', i ],
    () => api.getAsteroidShips(i),
    { enabled: !!i }
  );
};

export default useAsteroidShips;
