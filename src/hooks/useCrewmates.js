import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewmates = (ids) => {
  return useQuery(
    [ 'crewmates', ids.join(',') ],
    async () => {
      const crewmates = await api.getCrewmates(ids);
      return ids.map((id) => crewmates.find((c) => c.id === id));
    },
    { enabled: ids?.length > 0 }
  );
};

export default useCrewmates;
