import { useQuery } from 'react-query';

import api from '~/lib/api';

const useBuilding = (id) => {
  return useQuery(
    [ 'buildings', id ],
    () => api.getBuilding(id),
    { enabled: !!id }
  );
};

export default useBuilding;
