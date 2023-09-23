import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';

const useShipCrews = (shipId) => {
  return useQuery(
    [ 'entities', Entity.IDS.CREW, 'ship', shipId ],
    () => api.getShipCrews(shipId),
    { enabled: !!shipId }
  );
};

export default useShipCrews;
