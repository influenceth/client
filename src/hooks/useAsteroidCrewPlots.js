import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewPlots = (asteroidId, explicitCrewId) => {
  const { crew } = useCrewContext();
  const crewId = explicitCrewId || crew?.i;
  return useQuery(
    [ 'asteroidCrewPlots', asteroidId, crewId ],
    () => api.getCrewOccupiedPlots(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewPlots;
