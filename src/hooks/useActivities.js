import { useQuery, useQueryClient } from 'react-query';
import { hydrateActivities } from '~/lib/activities';

import api from '~/lib/api';

const useActivities = (entity) => {
  const queryClient = useQueryClient();
  return useQuery(
    [ 'activities', entity?.label, entity?.id ],
    async () => {
      const activities = await api.getEntityActivities(entity, { withAnnotations: true });
      await hydrateActivities(activities, queryClient);
      return activities;
    },
    { enabled: !!entity }
  );
};

export default useActivities;
