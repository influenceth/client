import { useQuery } from 'react-query';

import api from '~/lib/api';
import fakeShips from './_ships.json';

const useAsteroidShips = (i) => {
  return useQuery(
    [ 'ships', 'asteroid', i ], // TODO: cache by crew id too probably (or calc isOwnedByMe on the fly)
    () => fakeShips.filter((s) => s.asteroidId === i),
    { enabled: !!i }
  );
};

export default useAsteroidShips;
