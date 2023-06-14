import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidShips = (i) => {
  return useQuery(
    [ 'asteroidShips', i ], // TODO: cache by crew id too probably (or calc isOwnedByMe on the fly)
    () => ([  // TODO: make this real once know the structure of the data
      {
        i: 123,
        type: 1,
        status: 'ON_SURFACE', // IN_FLIGHT, IN_ORBIT, LAUNCHING, LANDING, ON_SURFACE
        asteroid: 1000,
        lot: 123,
        owner: 1,
      }
    ]),
    { enabled: !!i }
  );
};

export default useAsteroidShips;
