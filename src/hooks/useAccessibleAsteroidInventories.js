import { useQuery } from 'react-query';
import { Permission } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAccessibleAsteroidInventories = (asteroidId, isSourcing) => {
  const { crew } = useCrewContext();
  const permission = isSourcing ? Permission.IDS.REMOVE_PRODUCTS : Permission.IDS.ADD_PRODUCTS;

  return useQuery(
    [ 'asteroidInventories', asteroidId, crew?.id, permission ],
    () => api.getCrewAccessibleInventories(asteroidId, crew?.id, permission),
    { enabled: !!(asteroidId && crew?.id) }
  );
};

export default useAccessibleAsteroidInventories;