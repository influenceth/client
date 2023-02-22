import { useQuery } from 'react-query';

import api from '~/lib/api';
import useCrewContext from './useCrewContext';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrewContext();
  return useQuery(
    [ 'asteroidCrewSampledPlots', asteroidId, resourceId, crew?.i ],
    () => api.getCrewSampledPlots(asteroidId, crew?.i, resourceId),
    { enabled: !!(asteroidId && crew?.i && resourceId) }
  );
};

export default useAsteroidCrewSamples;
