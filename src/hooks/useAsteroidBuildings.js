import { useMemo } from 'react';
import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAsteroidBuildings = (asteroidId, reqComponent = 'Building', reqOneOfPermissions = null) => {
  const { crewCan } = useCrewContext();

  const { data: allData, ...queryProps } = useQuery(
    [ 'asteroidBuildings', asteroidId, reqComponent ],
    () => api.getBuildingsWithComponent(asteroidId, reqComponent),
    { enabled: !!asteroidId && !!reqComponent }
  );

  const perms = useMemo(() => 
    Array.isArray(reqOneOfPermissions) ? reqOneOfPermissions : (reqOneOfPermissions ? [reqOneOfPermissions] : []),
    [reqOneOfPermissions]
  );

  return useMemo(() => ({
    data: (allData || [])
      .filter((entity) => perms.length === 0 || perms.find((p) => crewCan(p, entity))),
    ...queryProps,
  }), [allData, crewCan, queryProps])
};

export default useAsteroidBuildings;