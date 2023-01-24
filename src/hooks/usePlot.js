import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';

const usePlot = (asteroidId, plotId) => {
  return useQuery(
    [ 'plots', asteroidId, plotId ],
    () => api.getPlot(asteroidId, plotId),
    { enabled: !!(asteroidId && plotId) }
  );
};

export default usePlot;
