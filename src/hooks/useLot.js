import { useQuery } from 'react-query';

import api from '~/lib/api';


//
const useLocationEntities = ({ asteroidId, lotId, buildingId, shipId }) => {
  // asteroidId
  //  (Asteroid)
  //  Building, Crew, Ships, Deliveries, Orders, Deposits
  // asteroidId, lotId
  //  Building, Crew, Ships, Deliveries, Orders, Deposits
  // buildingId
  //  Building, Crew, Ships, Deliveries, Orders
  // shipId
  //  Ship, Crew, Deliveries
};


// TODO: ecs refactor -- this is
const useLot = (asteroidId, lotId) => {
  return useQuery(
    [ 'lots', asteroidId, lotId ],
    () => {
      // TODO: return all entities on lot
      //  lot: { id, i, building, crews, deposits, deliveries, outgoingDeliveries, ships }
      //    building: { id, i, Inventories, Extractors, Processors, dryDock, dock, station }
      return api.getLot(asteroidId, lotId)
    },
    { enabled: !!(asteroidId && lotId) }
  );
};

export default useLot;
