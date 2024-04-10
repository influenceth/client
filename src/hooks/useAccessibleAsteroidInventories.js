import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Entity, Permission, Ship } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAccessibleAsteroidInventories = (asteroidId, isSourcing) => {
  const { crew } = useCrewContext();
  const permission = isSourcing ? Permission.IDS.REMOVE_PRODUCTS : Permission.IDS.ADD_PRODUCTS;

  const permissionCrewId = crew?.id;
  const permissionAccount = crew?.Crew?.delegatedTo;
  
  const { data: buildings, isLoading: buildingsLoading } = useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, hasComponent: 'Inventories', hasPermission: permission, permissionCrewId, permissionAccount }),
    () => api.getAsteroidBuildingsWithAccessibleInventories(asteroidId, permissionCrewId, permissionAccount, permission),
    { enabled: !!(asteroidId && permission && permissionCrewId && permissionAccount) }
  );

  const { data: ships, isLoading: shipsLoading } = useQuery(
    entitiesCacheKey(Entity.IDS.SHIP, { asteroidId, hasComponent: 'Inventories', hasPermission: permission, permissionCrewId, permissionAccount, isOnSurface: true, status: Ship.STATUSES.AVAILABLE }),
    () => api.getAsteroidShipsWithAccessibleInventories(asteroidId, permissionCrewId, permissionAccount, permission),
    { enabled: !!(asteroidId && permission && permissionCrewId && permissionAccount) }
  );

  return useMemo(() => ({
    data: buildingsLoading || shipsLoading
      ? undefined
      : [...(buildings || []), ...(ships || [])],
    isLoading: buildingsLoading || shipsLoading
  }), [buildings, ships, buildingsLoading, shipsLoading])
};

export default useAccessibleAsteroidInventories;