import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useCrewmates = (ids) => {
  return useQuery(
    [ 'entities', Entity.IDS.CREWMATE, (ids || []).join(',') ], // TODO: joined key
    async () => {
      const crewmates = await api.getCrewmates(ids);
      return ids.map((id) => crewmates.find((c) => c.id === id));
    },
    { enabled: ids?.length > 0 }
  );
};

export default useCrewmates;
