import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useStationedCrews = (entityId) => {
  return useQuery(
    [ 'entities', Entity.IDS.CREW, 'stationed', entityId ],
    () => api.getStationedCrews(entityId),
    { enabled: !!entityId }
  );
};

export default useStationedCrews;
