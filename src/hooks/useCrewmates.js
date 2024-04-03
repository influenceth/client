import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useCrewmates = (ids) => {
  return useQuery(
    entitiesCacheKey(Entity.IDS.CREWMATE, ids?.join(',')), // TODO: joined key
    async () => {
      const crewmates = await api.getCrewmates(ids);
      return ids.map((id) => crewmates.find((c) => c.id === id)); // sort by order of ids
    },
    { enabled: ids?.length > 0 }
  );
};

export default useCrewmates;
