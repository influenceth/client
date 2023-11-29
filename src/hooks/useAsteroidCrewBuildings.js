import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewBuildings = (asteroidId, explicitCrewId) => {
  const { crew } = useCrewContext();
  const crewId = explicitCrewId || crew?.id;
  return useQuery(
    // TODO: convert this to 'entities' model of cache keys?
    [ 'asteroidCrewBuildings', asteroidId, crewId ],
    () => api.getCrewBuildingsOnAsteroid(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewBuildings;
