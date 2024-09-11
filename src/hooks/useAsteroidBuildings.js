import { useMemo } from '~/lib/react-debug';
import { useQuery } from 'react-query';
import { Building, Entity, Permission } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { entitiesCacheKey } from '~/lib/cacheKey';

const useAsteroidBuildings = (asteroidId, reqComponent = 'Building', reqOneOfPermissions = null) => {
  const { crew, crewCan } = useCrewContext();

  const { data: allData, dataUpdatedAt, isLoading, refetch } = useQuery(
    entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId: Number(asteroidId), hasComponent: reqComponent, status: Building.CONSTRUCTION_STATUSES.OPERATIONAL }),
    () => api.getBuildingsWithComponent(asteroidId, reqComponent),
    { enabled: !!asteroidId && !!reqComponent }
  );

  const perms = useMemo(import.meta.url, () =>
    Array.isArray(reqOneOfPermissions) ? reqOneOfPermissions : (reqOneOfPermissions ? [reqOneOfPermissions] : []),
    [reqOneOfPermissions]
  );

  return useMemo(import.meta.url, () => {
    let data = allData;

    // if perms check, filter
    if (perms.length > 0) {
      // if there is a logged in crew, use crewCan
      if (crew) {
        data = (allData || []).filter((entity) => !!perms.find((p) => crewCan(p, entity)));

      // else, use empty crew (will only return public)... this is (at least) necessary
      // to calculate starterpack price for logged out / no-recruit crews
      } else {
        data = (allData || []).filter((entity) => !!perms.find((p) => Permission.isPermitted({}, p, entity)));
      }
    }
    return {
      data,
      isLoading,
      refetch,
      dataUpdatedAt: Date.now() // to capture changes to crewCan
    };
  }, [crew, crewCan, dataUpdatedAt, isLoading, perms, refetch]);
};

export default useAsteroidBuildings;