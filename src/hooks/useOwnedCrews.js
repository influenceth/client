import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useOwnedCrews = (accountAddress) => {
  return useQuery(
    entitiesCacheKey(Entity.IDS.CREW, { owner: accountAddress }),
    () => api.getOwnedCrews(accountAddress),
    { enabled: !!accountAddress }
  );
};

export default useOwnedCrews;
