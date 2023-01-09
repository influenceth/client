import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';

const usePlot = (asteroidId, plotId) => {
  return useQuery(
    [ 'plots', asteroidId, plotId ],
    () => {
      return api.getPlot(asteroidId, plotId)
        .then((plot) => {
          if (plot?.building) {
            plot.building.assetId = parseInt(Object.keys(Capable.TYPES).find((i) => Capable.TYPES[i].name === plot.building.__t));
          }
          return plot;
        });
    },
    { enabled: !!(asteroidId && plotId) }
  );
};

export default usePlot;
