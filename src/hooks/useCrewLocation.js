import { useQuery } from 'react-query';

import api from '~/lib/api';

const useCrewLocation = (id) => {
  return useQuery(
    [ 'crewLocation', id ],
    () => api.getCrewLocation(id),
    { enabled: !!id }
  );
};

export default useCrewLocation;
