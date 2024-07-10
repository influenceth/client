import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Building, Entity } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroidBuildings = (asteroidId, reqComponent = 'Building', reqOneOfPermissions = null) => {
  const { crewCan } = useCrewContext();

  const { data: allData, dataUpdatedAt, isLoading, refetch } = useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, hasComponent: reqComponent, status: Building.CONSTRUCTION_STATUSES.OPERATIONAL }),
    () => api.getBuildingsWithComponent(asteroidId, reqComponent),
    { enabled: !!asteroidId && !!reqComponent }
  );

  const perms = useMemo(() =>
    Array.isArray(reqOneOfPermissions) ? reqOneOfPermissions : (reqOneOfPermissions ? [reqOneOfPermissions] : []),
    [reqOneOfPermissions]
  );

  return useMemo(() => ({
    data: perms.length === 0
      ? allData
      : (allData || []).filter((entity) => !!perms.find((p) => crewCan(p, entity))),
    isLoading,
    refetch,
    dataUpdatedAt: Date.now() // to capture changes to crewCan
  }), [crewCan, dataUpdatedAt, isLoading, perms, refetch]);
};

export default useAsteroidBuildings;