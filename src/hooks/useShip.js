import { useQuery } from 'react-query';

import api from '~/lib/api';

const useShip = (shipId) => {
  return useQuery(
    [ 'ships', shipId ],
    () => api.getShip(shipId),
    { enabled: !!shipId }
  );
};

export default useShip;
