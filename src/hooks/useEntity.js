import { useQuery } from 'react-query';

import api from '~/lib/api';

const useEntity = ({ label, id } = {}) => {
  return useQuery(
    [ 'entity', label, id ],
    () => api.getEntityById({ label, id }),
    { enabled: !!(label && id) }
  );
};

// NOTE: this was an attempt to re-write entities contained on a lot
//       (see useLot for more)
//       (if successful, can remove most explicit lot invalidations in getInvalidations)
// const useEntity = ({ label, id } = {}) => {
//   const queryClient = useQueryClient();

//   return useQuery(
//     [ 'entity', label, id ],
//     async () => {
//       console.log('useEntity', label, id, 'refetch');

//       // TODO: if invalidated, will this still return?
//       const previousData = queryClient.getQueryData([ 'entity', label, id ]);
//       console.log({ previousData });
//       const prevLotId = locationsArrToObj(previousData?.Location?.locations || [])?.lotId;

//       // actual fetch
//       const data = await api.getEntityById({ label, id });

//       // TODO: this only invalidates new location
//       const lotId = locationsArrToObj(data?.Location?.locations || [])?.lotId;
//       if (lotId) {
//         upsertToCachedLot(queryClient, lotId, data);
//       }
//       if (prevLotId && prevLotId !== lotId) {
//         removeFromCachedLot(queryClient, prevLotId, data);
//       }

//       return data;
//     },
//     { enabled: !!(label && id) }
//   );
// };

export default useEntity;
