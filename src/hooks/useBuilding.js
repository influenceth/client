import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useBuilding = (id) => {
  return useQuery(
    [ 'entity', Entity.IDS.BUILDING, id ],
    () => api.getBuilding(id),
    { enabled: !!id }
  );
};

export default useBuilding;
