import { useQuery } from 'react-query';

import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useEntities = (props) => {
  const { label, ids } = props || {};
  return useQuery(
    entitiesCacheKey(label, ids?.join(',')),
    () => api.getEntities({ label, ids }),
    { enabled: !!(label && ids?.length > 0) }
  );
};

export default useEntities;
