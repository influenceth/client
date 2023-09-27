import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useShip = (id) => {
  return useQuery(
    [ 'entity', Entity.IDS.SHIP, id ],
    () => api.getShip(id),
    { enabled: !!id }
  );
};

export default useShip;
