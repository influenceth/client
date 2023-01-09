import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';
import useCrew from './useCrew';

const useAsteroidCrewPlots = (asteroidId, explicitCrewId) => {
  const { crew } = useCrew();
  const crewId = explicitCrewId || crew?.i;
  return useQuery(
    [ 'asteroidCrewPlots', asteroidId, crewId ],
    () => {
      return api.getCrewOccupiedPlots(asteroidId, crewId)
        .then((plots) => {
          return (plots || []).map((plot) => {
            if (plot?.building) {
              plot.building.assetId = parseInt(Object.keys(Capable.TYPES).find((i) => Capable.TYPES[i].name === plot.building.__t));
            }
            return plot;
          });
        });
    },
    { enabled: !!(asteroidId && crewId) }
  );
};

export default useAsteroidCrewPlots;
