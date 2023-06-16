import { useQuery } from 'react-query';

import api from '~/lib/api';
import { useShipAssets } from './useAssets';
import fakeShips from './_ships.json';

const useShip = (shipId) => {
  const shipAssets = useShipAssets();
  return useQuery(
    [ 'ships', shipId ],
    () => {
      const ship = fakeShips.find((s) => s.i === shipId); // IN_FLIGHT, IN_ORBIT, LAUNCHING, LANDING, IN_PORT, ON_SURFACE
      return {
        ...shipAssets[ship.type],
        ...ship
      };
    },
    { enabled: !!shipId }
  );
};

export default useShip;
