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
        plots[x] = [-1, 0, 0];
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
        owner: '___',
        leaseStatus: -1,
        plots // TODO: is this cheaper as a (U)Int8Array or something?
      };
    },
    { enabled: !!i }
  );
};

export default useAsteroidPlots;
