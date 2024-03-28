import { useQuery } from 'react-query';
import { Entity, Permission } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAccessibleAsteroidInventories = (asteroidId, isSourcing) => {
  const { crew } = useCrewContext();
  const permission = isSourcing ? Permission.IDS.REMOVE_PRODUCTS : Permission.IDS.ADD_PRODUCTS;

  const permissionCrewId = crew?.id;
  const { data: buildings, isLoading: buildingsLoading } = useQuery(
    ['entities', Entity.IDS.BUILDING, { asteroidId, permission, permissionCrewId, hasComponent: 'Inventories' }],
    () => api.getCrewAccessibleInventories(asteroidId, permissionCrewId, permission),
    { enabled: !!(asteroidId && permission && permissionCrewId) }
  );

  const { data: ships, isLoading: shipsLoading } = useQuery(
    ['entities', Entity.IDS.SHIP, { asteroidId, permission, permissionCrewId, hasComponent: 'Inventories' }],
    () => api.getCrewAccessibleInventories(asteroidId, permissionCrewId, permission),
    { enabled: !!(asteroidId && permission && permissionCrewId) }
  );

  return useMemo(() => ({
    data: [...(buildings || []), ...(ships || [])],
    isLoading: buildingsLoading || shipsLoading
  }), [buildings, ships, buildingsLoading, shipsLoading])
};

export default useAccessibleAsteroidInventories;