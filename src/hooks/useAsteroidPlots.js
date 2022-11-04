import { useQuery } from 'react-query';

// import api from '~/lib/api';

const population = 0.1;

const useAsteroidPlots = (i, tally) => {
  return useQuery(
    [ 'asteroidPlots', i, tally ],  // TODO: tally may be unnecessary once api connected
    // () => api.getAsteroidPlots(i),
    () => {
      // TODO: replace mock data
      // TODO: is this cheaper as a 1-dim array?
      const plots = [];
      const mockBuildingType = 25;
      for (let x = 0; x < tally; x++) {
        // leaseStatus, buildingType, underConstruction
        // leaseStatus: (-1 reserved by owner, 0 rentable, 1 rented by me, 2 rented by other)
        const r = Math.random();
        if (r < population) {
          plots[x] = [-1, mockBuildingType, 0];
        } else if (r < population * 1.05) {
          plots[x] = [1, mockBuildingType, 0];
        }
      }
      return {
        owner: '___',
        leaseStatus: -1,
        plots
      };
    },
    { enabled: !!i }
  );
};

export default useAsteroidPlots;
