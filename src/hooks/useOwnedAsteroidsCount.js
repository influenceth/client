import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOwnedAsteroidsCount = () => {
  return useQuery(
    [ 'asteroids', 'ownedCount' ],
    api.getOwnedAsteroidsCount
  );
};

export default useOwnedAsteroidsCount;
