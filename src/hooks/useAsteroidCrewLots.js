import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewLots = (asteroidId, explicitCrewId) => {
  const { crew } = useCrewContext();
  const crewId = explicitCrewId || crew?.i;
  return useQuery(
    [ 'asteroidCrewLots', asteroidId, crewId ],
    () => api.getCrewOccupiedLots(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewLots;
