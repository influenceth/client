import { useQuery, useQueryClient } from 'react-query';
import { Entity, Lot, Permission } from '@influenceth/sdk';

import useSimulationState from '~/hooks/useSimulationState';
import SIMULATION_CONFIG from './simulationConfig';
import { useCallback, useEffect, useMemo } from 'react';
import { entitiesCacheKey } from '~/lib/cacheKey';
import { entityToAgreements } from '~/lib/utils';


// TODO: IMPORTANT: refetch all on simulationEnabled change (in either direction)

const extendedEntity = ({ id, label }) => ({ id, label, uuid: Entity.packEntity({ id, label }) });
const nowSec = Math.floor(Date.now()) / 1e3;

const MockDataItem = ({ overwrite }) => {
  const queryClient = useQueryClient();
  const { dataUpdatedAt } = useQuery(overwrite.queryKey);
  useEffect(() => {
    const { queryKey, transformer } = overwrite;
    queryClient.setQueryData(
      queryKey,
      transformer(queryClient.getQueryData(queryKey)),
      { updatedAt: dataUpdatedAt }
    );
    // TODO: make sure this doesn't trigger a 2nd dataUpdatedAt
  }, [overwrite, dataUpdatedAt]);

  return null;
};

const MockDataManager = () => {
  const simulation = useSimulationState();

  const overwrites = useMemo(() => {
    const configs = [];

    // sway balance
    configs.push({
      queryKey: [ 'walletBalance', 'sway', SIMULATION_CONFIG.accountAddress ],
      transformer: () => simulation.sway || SIMULATION_CONFIG.startingSway
    });

    // lot-related
    if (simulation.lots) {
      
      // packed lot data
      configs.push({
        queryKey: [ 'asteroidPackedLotData', 1 ], // TODO: get asteroidId from SIMULATION_CONFIG
        transformer: (data) => {
          if (data) {
            Object.keys(simulation.lots).forEach((lotId) => {
              const lotIndex = Lot.toIndex(lotId);
              data[lotIndex] = ((simulation.lots[lotId]?.buildingType || 0) << 4) // capable type
                + (2 << 2) // leased
                + (0 << 1) // crew present
                + (0);     // samples for sale
            });
          }
          return data;
        }
      });

      // TODO: build out lots by id for quick access from transformers
      // (i.e. can use entityToAgreements for agreements, etc)

      const simulatedLots = Object.keys(simulation.lots).map((lotId) => {
        const entity = extendedEntity({ id: lotId, label: Entity.IDS.LOT });
        const location = extendedEntity({ id: Lot.toPosition(lotId)?.asteroidId, label: Entity.IDS.ASTEROID });
        return {
          ...entity,
          Location: { location, locations: [location] },
          PrepaidAgreements: [{
            permission: Permission.IDS.USE_LOT,
            permitted: extendedEntity({ id: SIMULATION_CONFIG.crewId, label: Entity.IDS.CREW }),
            endTime: nowSec + parseInt(simulation.lots[lotId]?.leaseTerm),
            initialTerm: 30 * 86400,
            noticePeriod: 30 * 86400,
            noticeTime: 0,
            rate: simulation.lots[lotId]?.leaseRate,
            startTime: nowSec
          }]
        };
      })


      // wallet agreements
      configs.push({
        queryKey: [ 'agreements', SIMULATION_CONFIG.accountAddress ],
        transformer: (data) => {
          return (simulatedLots || []).reduce((acc, lot) => { acc.push(...entityToAgreements(lot)); return acc; }, []);
        }
      });

      // wallet assets
      // configs.push({
      //   queryKey: entitiesCacheKey(Entity.IDS.ASTEROID, { owner: accountAddress, controllerId: controllerIds }),
      //   transformer: (data) => data,
      // });
      // configs.push({
      //   queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { controllerId: controllerIds, status: statuses }),
      //   transformer: (data) => data,
      // });
      // configs.push({
      //   queryKey: entitiesCacheKey(Entity.IDS.SHIP, { owner: accountAddress, controllerId: controllerIds }),
      //   transformer: (data) => data,
      // });

      // lot + lot entities
      simulatedLots.forEach((lot) => {
        configs.push({
          queryKey: [ 'entity', Entity.IDS.LOT, lot.id ],
          transformer: (data) => {
            return data ? { ...data, ...lot } : { ...lot }
          }
        });

        // const { buildingType } = simulation.lots[lotId] || {};
        // configs.push({
        //   queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { lotId }),
        //   transformer: (data) => data
        // });
        // configs.push({
        //   queryKey: entitiesCacheKey(Entity.IDS.DEPOSIT, { lotId }),
        //   transformer: (data) => data
        // });
        // configs.push({
        //   queryKey: entitiesCacheKey(Entity.IDS.SHIP, { lotId }),
        //   transformer: (data) => data
        // });
      })
    }

    return configs.map((c) => ({ ...c, key: JSON.stringify(c.queryKey) }));
  }, [simulation]);

  console.log('configs', overwrites);


  // entity, entities
  // [ 'entity', label, id ],
  // entitiesCacheKey(label, ids?.join(',')),

  // lot:
  // Entity.IDS.BUILDING, Entity.IDS.DEPOSIT, Entity.IDS.SHIP
  // entitiesCacheKey(entityLabel, { lotId }),



  
  // TODO: ...
  // asteroid ships
  // entitiesCacheKey(Entity.IDS.SHIP, { asteroidId, status: Ship.STATUSES.AVAILABLE }),

  // crew orders
  // [ 'crewOpenOrders', controllerId ],

  // crew samples
  // entitiesCacheKey(Entity.IDS.DEPOSIT, { controllerId, isDepleted: false }),

  // deliveries
  // const cacheKey = useMemo(() => {
  //   const k = {};
  //   if (destination) k.destination = safeEntityId(destination);
  //   if (origin) k.origin = safeEntityId(origin);
  //   if (status) k.status = status;
  //   return k;
  // }, [ destination, origin, status ]);

  // const { data: rawData, isLoading, dataUpdatedAt } = useQuery(
  //   entitiesCacheKey(Entity.IDS.DELIVERY, cacheKey),

  // stationed crews
  // entitiesCacheKey(Entity.IDS.CREW, { stationUuid: entityUuid }),
  
  // unresolved activities
  // [ 'activities', entity?.label, entity?.id, 'unresolved' ],

  // asset search
  // [ 'search', esAssetType, query ],

  // asteroid buildings
  // entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, hasComponent: reqComponent, status: Building.CONSTRUCTION_STATUSES.OPERATIONAL }),

  // asteroid crew samples
  // entitiesCacheKey(Entity.IDS.DEPOSIT, { asteroidId, resourceId, controllerId, isDepleted: false }),

  // entity activities
  // [ 'activities', entity?.label, entity?.id ],

  // crew accessible inventories
  // entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, hasComponent: 'Inventories', hasPermission: Permission.IDS.ADD_PRODUCTS, permissionCrewId, permissionAccount }),
  // entitiesCacheKey(Entity.IDS.BUILDING, { asteroidId, hasComponent: 'Inventories', hasPermission: Permission.IDS.REMOVE_PRODUCTS, permissionCrewId, permissionAccount }),

  return overwrites.map((o) => <MockDataItem key={o.key} overwrite={o} />);
};

export default MockDataManager;