import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const useOwnedAsteroids = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'asteroids', 'list', 'owned' ],
    () => api.getEntities({ match: { 'Nft.owners.starknet': account }, label: Entity.IDS.ASTEROID }),
    { enabled: !!account }
  );
};

export default useOwnedAsteroids;
