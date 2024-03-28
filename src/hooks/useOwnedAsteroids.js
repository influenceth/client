import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useSession from '~/hooks/useSession';

const useOwnedAsteroids = () => {
  const { accountAddress, authenticated } = useSession();

  return useQuery(
    [ 'entities', Entity.IDS.ASTEROID, { owner: accountAddress } ],
    async () => {
      if (!authenticated) return [];
      return await api.getEntities({ match: { 'Nft.owners.starknet': accountAddress }, label: Entity.IDS.ASTEROID });
    },
    { enabled: !!accountAddress }
  );
};

export default useOwnedAsteroids;
