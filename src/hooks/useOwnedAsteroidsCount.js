import { useQuery } from 'react-query';

import api from '~/lib/api';

// TODO: ecs refactor

const useOwnedAsteroidsCount = () => {
  return useQuery(
    [ 'asteroids', 'ownedCount' ],
    api.getOwnedAsteroidsCount
  );
};

export default useOwnedAsteroidsCount;
