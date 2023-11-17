import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrewContext();
  return useQuery(
    // TODO: convert this to 'entities' model of cache keys (update invalidations!)
    [ 'asteroidCrewSampledLots', asteroidId, resourceId, crew?.id ],
    () => api.getCrewSamplesOnAsteroid(asteroidId, crew?.id, resourceId),
    { enabled: !!(asteroidId && crew?.id && resourceId) }
  );
};

export default useAsteroidCrewSamples;
