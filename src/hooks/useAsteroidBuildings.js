import { useMemo } from 'react';
import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAsteroidBuildings = (asteroidId, reqComponent = 'Building', reqOneOfPermissions = null) => {
  const { crew, crewCan } = useCrewContext();

  const { data: allData, ...queryProps } = useQuery(
    [ 'asteroidBuildings', asteroidId, crew?.id, reqComponent ],
    () => api.getBuildingsWithComponent(asteroidId, crew?.id, reqComponent),
    { enabled: !!(asteroidId && crew?.id) }
  );

  const perms = useMemo(() => 
    Array.isArray(reqOneOfPermissions) ? reqOneOfPermissions : (reqOneOfPermissions ? [reqOneOfPermissions] : []),
    [reqOneOfPermissions]
  );

  return useMemo(() => ({
    data: (allData || [])
      .filter((entity) => perms.length === 0 || perms.find((p) => crewCan(p, entity))),
    ...queryProps,
  }), [allData, queryProps])
};

export default useAsteroidBuildings;