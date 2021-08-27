import { useQuery } from 'react-query';

import api from '~/lib/api';

const useOwnedAsteroidsCount = () => {
  return useQuery('ownedAsteroidsCount', api.getOwnedAsteroidsCount);
};

export default useOwnedAsteroidsCount;
