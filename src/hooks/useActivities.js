import { useQuery } from 'react-query';

import api from '~/lib/api';

const useActivities = (entity) => {
  return useQuery(
    [ 'activities', entity.label, entity.id ],
    () => api.getEntityActivities(entity),
    { enabled: !!entity }
  );
};

export default useActivities;
