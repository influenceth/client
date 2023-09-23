import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrewContext();
  return useQuery(
    // TODO: convert this to 'entities' model of cache keys
    [ 'asteroidCrewSampledLots', asteroidId, resourceId, crew?.i ],
    () => api.getCrewSampledLots(asteroidId, crew?.i, resourceId),
    { enabled: !!(asteroidId && crew?.i && resourceId) }
  );
};

export default useAsteroidCrewSamples;
