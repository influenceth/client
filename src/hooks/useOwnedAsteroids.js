import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';

// TODO: ecs refactor

const useOwnedAsteroids = () => {
  const { account } = useAuth();

  return useQuery(
    [ 'asteroids', 'list', { hydrated: true, ownedBy: account } ],
    () => ([]), // api.getAsteroids({ hydrated: true, ownedBy: account }),
    { enabled: !!account }
  );
};

export default useOwnedAsteroids;
