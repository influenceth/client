import { useQuery, useQueryClient } from 'react-query';
import { hydrateActivities } from '~/lib/activities';

import api from '~/lib/api';

const useEarliestActivity = (entity) => {
  const queryClient = useQueryClient();
  return useQuery(
    [ 'activities', entity.label, entity.id, 'earliest' ],
    async () => {
      const arr = await api.getEntityActivities(entity, { pageSize: 1, order: 'asc' });
      await hydrateActivities(arr, queryClient); // NOTE: this is probably not necessary in any case
      return arr?.[0];
    },
    { enabled: !!entity }
  );
};

export default useEarliestActivity;
