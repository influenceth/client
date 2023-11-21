import { useQuery, useQueryClient } from 'react-query';
import cloneDeep from 'lodash/cloneDeep';
import { Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import { useEffect, useMemo } from 'react';
import useBuilding from './useBuilding';

// const useLot = (lotId) => {
//   return useQuery(
//     // NOTE: this includes metadata that may not play as nicely with
//     //  a more standardized entity caching model... so when we get
//     //  there, we may want to rename this cache key
//     [ 'entity', Entity.IDS.LOT, lotId ],
//     () => api.getLot(lotId),
//     { enabled: !!lotId }
//   );
// };

const useLot = (lotId) => {
  const queryClient = useQueryClient();

  const lotEntity = useMemo(() => ({ id: lotId, label: Entity.IDS.LOT }), [lotId]);

  // prepop all the entities on the lot in the cache
  // so can do in a single query
  const { data: lotData, isLoading } = useQuery(
    ['lot', lotId],
    async () => {
      const lot = (await api.getEntityById(lotEntity)) || lotEntity;

      // populate from single query... set query data
      const lotEntities = (await api.getEntities({
        match: { 'Location.locations': lotEntity },
        components: [ // this should include all default components returned for relevant entities (buildings, ships, deposits)
          'Building', 'Control', 'Dock', 'DryDock', 'Exchange', 'Extractor', 'Inventory', 'Location', 'Name', 'Processor', 'Station',
          /*'Control',*/ 'Deposit', /*'Location',*/
          /*'Control', 'Inventory', 'Location', 'Name',*/ 'Ship', /*'Station',*/
        ]
      })) || [];

      // update queryClient for individual entities, so that when invalidated, they are refetched
      // (when is when the data on the lot gets updated)
      lotEntities.forEach((e) => {
        queryClient.setQueryData([ 'entity', e.label, e.id ], e);
      });

      [Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP].forEach((label) => {
        queryClient.setQueryData(
          ['entities', label, 'lot', lotId],
          lotEntities.filter((e) => e.label === label)
        );
      })
      
      return lot;
    },
    { enabled: !!lotId }
  );

  const { data: buildings, isLoading: buildingsLoading } = useQuery(
    ['entities', Entity.IDS.BUILDING, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.BUILDING, match: { 'Location.locations': lotEntity } }),
    { enabled: !!lotData } // give a chance to preload the data
  );

  const { data: deposits, isLoading: depositsLoading } = useQuery(
    ['entities', Entity.IDS.DEPOSIT, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.DEPOSIT, match: { 'Location.locations': lotEntity } }),
    { enabled: !!lotData } // give a chance to preload the data
  );

  const { data: ships, isLoading: shipsLoading } = useQuery(
    ['entities', Entity.IDS.SHIP, 'lot', lotId],
    () => api.getEntities({ label: Entity.IDS.SHIP, match: { 'Location.locations': lotEntity } }),
    { enabled: !!lotData } // give a chance to preload the data
  );

  return useMemo(() => ({
    data: {
      ...lotEntity,
      building: (buildings || []).find((e) => e.Building.status > 0),
      deposits: (deposits || []).filter((e) => e.Deposit.status > 0 && e.Deposit.remainingYield > 0),
      ships,
      ship: ships?.[0] // TODO: deprecate?
    },
    isLoading: isLoading || buildingsLoading || depositsLoading || shipsLoading
  }), [lotEntity, buildings, deposits, ships, isLoading, buildingsLoading, depositsLoading, shipsLoading])

};

export default useLot;
