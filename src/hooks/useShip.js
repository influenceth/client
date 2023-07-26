import { useQuery } from 'react-query';

import api from '~/lib/api';

const useShip = (shipId) => {
  return useQuery(
    [ 'ships', shipId ],
    () => {
      return {};
    },
    { enabled: !!shipId }
  );
};

export default useShip;
