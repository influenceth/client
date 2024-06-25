import { useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';
import activities, { hydrateActivities } from '~/lib/activities';

const useBusyActivity = (entity) => {
  const queryClient = useQueryClient();
  return useQuery(
    [ 'activities', entity?.label, entity?.id, 'busy' ],
    async () => {
      const busyEvents = Object.keys(activities).filter((i) => !!activities[i].getBusyItem);
      const items = await api.getEntityActivities(entity, { events: busyEvents, pageSize: 1 });
      await hydrateActivities(items, queryClient);
      return items?.[0] || null;
    },
    { enabled: !!entity }
  );
};

export default useBusyActivity;
