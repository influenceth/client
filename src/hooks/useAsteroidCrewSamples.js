import api from '~/lib/api';
import useCrew from './useCrew';
import { usePlotAggregate } from './usePlot';

const useAsteroidCrewSamples = (asteroidId, resourceId) => {
  const { crew } = useCrew();
  return usePlotAggregate(
    [ 'plots', 'sampled', asteroidId, resourceId, crew?.i ],
    () => api.getCrewSampledPlots(asteroidId, crew?.i, resourceId),
    { enabled: !!(asteroidId && crew?.i && resourceId) }
  );
};

export default useAsteroidCrewSamples;
