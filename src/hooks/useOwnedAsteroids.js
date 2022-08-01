import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

const baseQuery = { hydrated: true };

const useOwnedAsteroids = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'asteroids', 'search', {...baseQuery, ownedBy: account } ],
    () => api.getAsteroids({...baseQuery, ownedBy: account }),
    { enabled: !!account }
  );
};

export default useOwnedAsteroids;
