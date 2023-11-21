import { useQuery, useQueryClient } from 'react-query';
import cloneDeep from 'lodash/cloneDeep';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { useMemo } from 'react';
import useBuilding from './useBuilding';

const useLot = (lotId) => {
  return useQuery(
    // NOTE: this includes metadata that may not play as nicely with
    //  a more standardized entity caching model... so when we get
    //  there, we may want to rename this cache key
    [ 'entity', Entity.IDS.LOT, lotId ],
    () => api.getLot(lotId),
    { enabled: !!lotId }
  );
};

// NOTE: this was an attempt to re-write entities contained on a lot
//       (see useEntity for more)
// // TODO: deprecate getLot in api
// const useLotEntities = (lotId) => {
//   const queryClient = useQueryClient();

//   return useQuery(
//     ['lot', lotId],
//     async () => {
//       if (doDebug(lotId)) console.log('refetch lot');
      
//       const lotEntity = { id: lotId, label: Entity.IDS.LOT };
//       const lot = (await api.getEntityById(lotEntity)) || lotEntity;
//       lot._entities = (await api.getEntities({
//         match: { 'Location.locations': lotEntity },
//         components: [ // this should include all default components returned for relevant entities (buildings, ships, deposits)
//           'Building', 'Control', 'Dock', 'DryDock', 'Exchange', 'Extractor', 'Inventory', 'Location', 'Name', 'Processor', 'Station',
//           /*'Control',*/ 'Deposit', /*'Location',*/
//           /*'Control', 'Inventory', 'Location', 'Name',*/ 'Ship', /*'Station',*/
//         ]
//       })) || [];

//       // update queryClient for individual entities, so that when invalidated, they are refetched
//       // (when is when the data on the lot gets updated)
//       lot._entities.forEach((e) => {
//         console.log('setting', e.label, e.id, e);
//         queryClient.setQueryData([ 'entity', e.label, e.id ], e);
//       });
      
//       return lot;
//     },
//     { enabled: !!lotId }
//   );
// }

// const useLot = (lotId) => {
//   const { data, ...queryResponse } = useLotEntities(lotId);

//   // TODO: this isn't that heavy, but hook is re-run everytime, and useLot
//   // is a very common hook to use, so it might be useful at some point to
//   // memoize this at a higher level (could even use useQuery)
//   const { _entities: [], ...lot } = cloneDeep(data);
//   lot.building = useBuilding(_entities.find((e) => e.label === Entity.IDS.BUILDING && e.Building.status > 0)?.id);
//   lot.ships = useShips(_entities.filter((e) => e.label === Entity.IDS.SHIP).map((e) => e.id));
//   lot.ship = lot.ships[0];  // TODO: deprecate?
//   lot.deposits = useDeposits(_entities.filter((e) => e.label === Entity.IDS.DEPOSIT && e.Deposit.status > 0 && e.Deposit.remainingYield > 0).map((e) => e.id));
  
//   return {
//     data: lot,
//     ...queryResponse
//   }
// }

// // const useLot = (lotId) => {
// //   const { data, ...queryResponse } = useLotEntities(lotId);

// //   // TODO: this isn't that heavy, but hook is re-run everytime, and useLot
// //   // is a very common hook to use, so it might be useful at some point to
// //   // memoize this at a higher level (could even use useQuery)
// //   const transformedData = useMemo(() => {
// //     if (!data) return data;
// //     if (doDebug(lotId)) console.log('re-transform', JSON.stringify(data));
    
// //     const { _entities, ...lot } = cloneDeep(data);
// //     lot.building = _entities.find((e) => e.label === Entity.IDS.BUILDING && e.Building.status > 0);
// //     lot.ships = _entities.filter((e) => e.label === Entity.IDS.SHIP);
// //     lot.ship = lot.ships[0];  // TODO: deprecate?
// //     lot.deposits = _entities.filter((e) => e.label === Entity.IDS.DEPOSIT && e.Deposit.status > 0 && e.Deposit.remainingYield > 0);
// //     return lot;
// //   }, [data?._entities]);

// //   return {
// //     data: transformedData,
// //     ...queryResponse
// //   }
// // }

// export const removeFromCachedLot = (queryClient, lotId, { label, id }) => {
//   console.log('removeFromCachedLot');
//   queryClient.setQueryData([ 'lot', lotId ], (old) => {
//     if (!old) return old;
//     const updated = cloneDeep(old);
//     updated._entities = updated._entities.filter((e) => e.label !== label && e.id !== id);
//     return updated;
//   });
// }
// export const upsertToCachedLot = (queryClient, lotId, data) => {
//   console.log('upsertToCachedLot');
//   queryClient.setQueryData([ 'lot', lotId ], (old) => {
//     if (!old) return old;
//     const updated = cloneDeep(old);
//     updated._entities = updated._entities.map((e) => e.label === data.label && e.id === data.id ? cloneDeep(data) : e);
//     return updated;
//   });
// }

export default useLot;
