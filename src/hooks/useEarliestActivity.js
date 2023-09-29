import { useQuery } from 'react-query';

import api from '~/lib/api';

const useEarliestActivity = (entity) => {
  return useQuery(
    [ 'activities', entity.label, entity.id, 'earliest' ],
    async () => {
      const arr = await api.getEntityActivities(entity, { pageSize: 1, order: 'asc' });
      return arr?.[0];
    },
    { enabled: !!entity }
  );
};

export default useEarliestActivity;
