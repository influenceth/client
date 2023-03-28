import { useQuery } from 'react-query';
import { Capable } from '@influenceth/sdk';

import api from '~/lib/api';

const useLot = (asteroidId, lotId) => {
  return useQuery(
    [ 'lots', asteroidId, lotId ],
    () => api.getLot(asteroidId, lotId),
    { enabled: !!(asteroidId && lotId) }
  );
};

export default useLot;
