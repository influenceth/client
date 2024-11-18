import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useWalletCrews = (overrideAccount) => {
  const { accountAddress: defaultAccount } = useSession();

  const accountAddress = overrideAccount || defaultAccount;
  return useQuery(
    entitiesCacheKey(Entity.IDS.CREW, { owner: accountAddress }),
    () => api.getOwnedCrews(accountAddress),
    { enabled: !!accountAddress }
  );
};

export default useWalletCrews;