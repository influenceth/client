import { useQuery } from 'react-query';

import api from '~/lib/api';

const useLot = (shipId) => {
  return useQuery(
    [ 'ships', shipId ],
    () => ({ // TODO: ...
      i: 123,
      type: 1,
      status: 'IN_ORBIT', // IN_FLIGHT, IN_ORBIT, LAUNCHING, LANDING, ON_SURFACE
      asteroid: 1000,
      lot: 123,
      owner: 1,
    }),
    { enabled: !!shipId }
  );
};

export default useLot;
