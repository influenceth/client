import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidPlots = (i, plotTally) => {
  return useQuery(
    [ 'asteroidPlots', i ],
    // TODO: incorporate my data (i.e. which buildings i own, etc)?
    // TODO: use default owner and default lease status
    () => api.getOccupiedPlots(i, plotTally),
    { enabled: !!(i && plotTally) }
  );
};

export default useAsteroidPlots;
