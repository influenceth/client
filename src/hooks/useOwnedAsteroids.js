import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useOwnedAsteroids = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'asteroids', 'list', account ],
    async () => {
      if (!account) return [];
      return await api.getEntities({ match: { 'Nft.owners.starknet': account }, label: Entity.IDS.ASTEROID });
    }
  );
};

export default useOwnedAsteroids;
