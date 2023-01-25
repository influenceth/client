import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrew from './useCrew';

const useAsteroidCrewPlots = (asteroidId, explicitCrewId) => {
  const { crew } = useCrew();
  const crewId = explicitCrewId || crew?.i;
  return useQuery(
    [ 'asteroidCrewPlots', asteroidId, crewId ],
    () => api.getCrewOccupiedPlots(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewPlots;
