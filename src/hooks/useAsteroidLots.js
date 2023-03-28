import { useQuery } from 'react-query';

import api from '~/lib/api';

const useAsteroidLots = (i, lotTally) => {
  return useQuery(
    [ 'asteroidLots', i ],
    // TODO: incorporate my data (i.e. which buildings i own, etc)?
    // TODO: use default owner and default lease status
    () => api.getOccupiedLots(i, lotTally),
    { enabled: !!(i && lotTally) }
  );
};

export default useAsteroidLots;
