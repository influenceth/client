import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidShips = (i) => {
  return useQuery(
    [ 'ships', 'asteroid', i ], // TODO: cache by crew id too probably (or calc isOwnedByMe on the fly)
    () => [],
    { enabled: !!i }
  );
};

export default useAsteroidShips;
