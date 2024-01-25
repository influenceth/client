import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewShips = (asteroidId, explicitCrewId) => {
  const { crew } = useCrewContext();
  const crewId = explicitCrewId || crew?.id;
  return useQuery(
    // TODO: convert this to 'entities' model of cache keys?
    [ 'asteroidCrewShips', asteroidId, crewId ],
    () => api.getCrewShipsOnAsteroid(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewShips;
