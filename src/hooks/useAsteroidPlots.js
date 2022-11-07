import { useQuery } from 'react-query';

import { getClosestPlots } from '~/game/scene/asteroid/helpers/PlotGeometry';
// import api from '~/lib/api';

const useAsteroidPlots = (i, tally) => {
  return useQuery(
    [ 'asteroidPlots', i, tally ],  // TODO: tally may be unnecessary once api connected
    // () => api.getAsteroidPlots(i),
    () => {
      const plots = [];
      const mockBuildingType = 25;
      for (let x = 0; x < tally; x++) {
        plots[x] = [-1, 0, 0];  // [rental status (-1 not for rent, 0 for rent, 1 rented by me, 2 rented by other), building type, under construction]
      }

      let townsEvery = Math.max(5, Math.ceil(tally / 20));
      for (let y = 0; y < tally; y += townsEvery) {
        const townSize = Math.ceil(10 + Math.random() * (tally / 80));
        const veryClose = getClosestPlots({ centerPlot: y + 1, plotTally: tally, findTally: Math.ceil(townSize / 10) });
        const lessClose = getClosestPlots({ centerPlot: y + 1, plotTally: tally, findTally: Math.ceil(townSize / 2) });
        const notClose = getClosestPlots({ centerPlot: y + 1, plotTally: tally, findTally: townSize });
        for (let p of veryClose) {
          if (Math.random() < 0.4) {
            if (tally > 5000 && y === 0) plots[p][0] = 1;
            plots[p][1] = mockBuildingType;
          }
        }
        for (let p of lessClose) {
          if (Math.random() < 0.15) {
            if (tally > 5000 && y === 0) plots[p][0] = 1;
            plots[p][1] = mockBuildingType;
          }
        }
        for (let p of notClose) {
          if (Math.random() < 0.04) {
            if (tally > 5000 && y === 0) plots[p][0] = 1;
            plots[p][1] = mockBuildingType;
          }
        }
        townsEvery += Math.random() * (townsEvery / 2) - (townsEvery / 4);
      }

      return {
        // owner: '0x002caa6a6a0658c063fa71fa3ae941121ac3d4222852c5b6c8839552b80c974d',
        owner: '___',
        leaseStatus: -1,
        plots // TODO: is this cheaper as a (U)Int8Array or something?
      };
    },
    { enabled: !!i }
  );
};

export default useAsteroidPlots;
