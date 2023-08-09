import { useQuery } from 'react-query';

import api from '~/lib/api';

const useShipCrews = (shipId) => {
  return useQuery(
    [ 'shipCrews', shipId ],
    () => api.getShipCrews(shipId),
    { enabled: !!shipId }
  );
};

export default useShipCrews;
