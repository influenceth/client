import api from '~/lib/api';
import useCrew from './useCrew';
import { usePlotAggregate } from './usePlot';

const useAsteroidCrewPlots = (asteroidId, explicitCrewId) => {
  const { crew } = useCrew();
  const crewId = explicitCrewId || crew?.i;
  return usePlotAggregate(
    [ 'plots', 'occupied', asteroidId, crewId ],
    () => api.getCrewOccupiedPlots(asteroidId, crewId),
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewPlots;
