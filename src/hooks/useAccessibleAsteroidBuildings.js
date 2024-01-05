import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useAccessibleAsteroidBuildings = (asteroidId, reqComponent = 'Building') => {
  const { crew } = useCrewContext();

  return useQuery(
    [ 'asteroidBuildings', asteroidId, crew?.id, reqComponent ],
    () => api.getCrewAccessibleBuildingsWithComponent(asteroidId, crew?.id, reqComponent),
    { enabled: !!(asteroidId && crew?.id) }
  );
};

export default useAccessibleAsteroidBuildings;