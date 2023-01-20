import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrew from './useCrew';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrew();
  return useQuery(
    [ 'asteroidCrewSampledPlots', asteroidId, resourceId ],
    () => api.getCrewSampledPlots(asteroidId, crew?.i, resourceId),
    { enabled: !!(asteroidId && crew?.i && resourceId) }
  );
};

export default useAsteroidCrewSamples;
