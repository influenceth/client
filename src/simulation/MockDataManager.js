import { QueryObserver, useQuery, useQueryClient } from 'react-query';
import { Building, Entity, Extractor, Inventory, Lot, Permission, Product } from '@influenceth/sdk';

import useSimulationState from '~/hooks/useSimulationState';
import SIMULATION_CONFIG from './simulationConfig';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { entitiesCacheKey } from '~/lib/cacheKey';
import { entityToAgreements } from '~/lib/utils';
import { statuses as walletBuildingStatuses } from '~/hooks/useWalletBuildings';

const nowSec = () => Math.floor(Date.now() / 1e3);

const contentsObjToArray = (contentsObj) => {
  return Object.keys(contentsObj || {}).map((product) => ({ product, amount: contentsObj[product] }));
}

const getBuildingInventories = (buildingType, buildingStatus, contentsBySlot = {}) => {
  const { siteSlot, siteType } = Building.TYPES[buildingType];

  const inv = [];
  inv.push({
    slot: siteSlot,
    inventoryType: siteType,
    mass: 0,
    reservedMass: 0,
    reservedVolume: 0,
    volume: 0,
    contents: contentsObjToArray(contentsBySlot?.[siteSlot]),
    status: buildingStatus === Building.CONSTRUCTION_STATUSES.PLANNED ? Inventory.STATUSES.AVAILABLE : Inventory.STATUSES.UNAVAILABLE
  });
  if (buildingType === Building.IDS.WAREHOUSE) {
    inv.push({
      slot: 2,
      inventoryType: Inventory.IDS.WAREHOUSE_PRIMARY,
      mass: 0,
      reservedMass: 0,
      reservedVolume: 0,
      volume: 0,
      contents: contentsObjToArray(contentsBySlot?.[2]),
      status: buildingStatus === Building.CONSTRUCTION_STATUSES.OPERATIONAL ? Inventory.STATUSES.AVAILABLE :  Inventory.STATUSES.UNAVAILABLE
    });
  }

  // TODO: it feels inelegant how we are doing this... 
  return inv.map((i) => {
    const [mass, volume] = (i.contents || []).reduce((acc, { product, amount }) => {
      acc[0] += amount * Product.TYPES[product].massPerUnit;
      acc[1] += amount * Product.TYPES[product].massPerUnit;
      return acc;
    }, [0, 0]);
    return { ...i, mass, volume }
  });
};


// TODO: IMPORTANT: refetch all on simulationEnabled change (in either direction)


const MockDataItem = ({ overwrite }) => {
  const queryClient = useQueryClient();

  // (this will listen to updates on that queryKey and assumes they will come from elsewhere in the application)
  const { dataUpdatedAt } = useQuery(overwrite.queryKey, () => {}, { enabled: false, staleTime: Infinity });
  useEffect(() => {
    const { queryKey, transformer } = overwrite;
    const transformedData = transformer(queryClient.getQueryData(queryKey));
    if (transformedData !== undefined) {
      queryClient.setQueryData(
        queryKey,
        transformedData,
        { updatedAt: dataUpdatedAt || Date.now() }
      );
    }
    // TODO: make sure this doesn't trigger a 2nd dataUpdatedAt
  }, [overwrite, dataUpdatedAt]);

  return null;
};

const MockDataManager = () => {
  const simulation = useSimulationState();

  const overwrites = useMemo(() => {
    const myCrewEntity = Entity.formatEntity({ id: SIMULATION_CONFIG.crewId, label: Entity.IDS.CREW });

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
          console.log('data0', data)
          if (data) {
            console.log('data1', data)
            Object.keys(simulation.lots).forEach((lotId) => {
              const lotIndex = Lot.toIndex(lotId);
              data[lotIndex] = ((simulation.lots[lotId]?.buildingType || 0) << 4) // capable type
                + (2 << 2) // leased
                + (0 << 1) // crew present
                + (0);     // samples for sale
            });
            return data;
          }
        }
      });

      // TODO: build out lots by id for quick access from transformers
      // (i.e. can use entityToAgreements for agreements, etc)

      const simulatedAgreements = [];
      const simulatedBuildings = [];
      const simulatedLots = [];

      Object.keys(simulation.lots).map((stringLotId) => {
        const lotId = Number(stringLotId);
        const { buildingId, buildingStatus, buildingType, leaseRate, leaseTerm, inventoryContents } = simulation.lots[lotId];

        const lotEntity = Entity.formatEntity({ id: lotId, label: Entity.IDS.LOT });
        const asteroidEntity = Entity.formatEntity({ id: Lot.toPosition(lotId)?.asteroidId, label: Entity.IDS.ASTEROID });
        
        const lot = {
          ...lotEntity,
          Location: { location: asteroidEntity, locations: [asteroidEntity] },
          PrepaidAgreements: [{
            permission: Permission.IDS.USE_LOT,
            permitted: myCrewEntity,
            endTime: nowSec() + parseInt(leaseTerm),
            initialTerm: 30 * 86400,
            noticePeriod: 30 * 86400,
            noticeTime: 0,
            rate: leaseRate,
            startTime: nowSec()
          }]
        };
        simulatedLots.push(lot);
        simulatedAgreements.push(...entityToAgreements(lot));

        // lot entity
        configs.push({
          queryKey: [ 'entity', Entity.IDS.LOT, lotId ],
          transformer: (data) => {
            return data ? { ...data, ...lot } : { ...lot }
          }
        });

        // if building id
        let building;
        if (buildingId) {
          building = {
            ...Entity.formatEntity({ id: buildingId, label: Entity.IDS.BUILDING }),
            Building: {
              buildingType,
              status: buildingStatus,
              plannedAt: nowSec(),
              finishTime: nowSec() // TODO: ?
            },
            Control: { controller: myCrewEntity },
            Location: {
              location: lotEntity,
              locations: [lotEntity, asteroidEntity]
            },
            Inventories: getBuildingInventories(buildingType, buildingStatus, inventoryContents)
          };

          // per-building components
          switch(buildingType) {
            case Building.IDS.EXTRACTOR:
              building.Extractors = [{
                // TODO: ...
                // destination: {},
                // destinationSlot,
                // finishTime: nowSec() + 123456,
                // yield: 234567,
                slot: 1,
                status: Extractor.STATUSES.IDLE,
              }];
              break;
          }

          simulatedBuildings.push(building);

          // building entity
          configs.push({
            queryKey: [ 'entity', Entity.IDS.BUILDING, buildingId ],
            transformer: (data) => building // not merging because choosing ids to avoid collisions
          });
        }

        // lot entities...

        // configs.push({
        //   queryKey: entitiesCacheKey(Entity.IDS.DEPOSIT, { lotId }),
        //   transformer: (data) => data
        // });
        configs.push({
          queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { lotId }),
          transformer: (data) => building ? [building] : []
        });
        // configs.push({
        //   queryKey: entitiesCacheKey(Entity.IDS.SHIP, { lotId }),
        //   transformer: (data) => data
        // });
      });

      // wallet agreements
      configs.push({
        queryKey: [ 'agreements', SIMULATION_CONFIG.accountAddress ],
        transformer: (data) => simulatedAgreements
      });

      // wallet assets
      const controllerIds = [SIMULATION_CONFIG.crewId];
      // configs.push({
      //   queryKey: entitiesCacheKey(Entity.IDS.ASTEROID, { owner: accountAddress, controllerId: controllerIds }),
      //   transformer: (data) => data,
      // });
      configs.push({
        queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { controllerId: controllerIds, status: walletBuildingStatuses }),
        transformer: (data) => simulatedBuildings,
      });
      // configs.push({
      //   queryKey: entitiesCacheKey(Entity.IDS.SHIP, { owner: accountAddress, controllerId: controllerIds }),
      //   transformer: (data) => data,
      // });


      // crew accessible inventories
      // TODO: disable UI for changing perms
      const invKeyObj = { asteroidId: 1, hasComponent: 'Inventories', permissionCrewId: SIMULATION_CONFIG.crewId, permissionAccount: SIMULATION_CONFIG.accountAddress }
      configs.push(
        {
          queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { ...invKeyObj, hasPermission: Permission.IDS.ADD_PRODUCTS }),
          transformer: (data) => simulatedBuildings.filter((b) => !!b.Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE))
        },
        {
          queryKey: entitiesCacheKey(Entity.IDS.BUILDING, { ...invKeyObj, hasPermission: Permission.IDS.REMOVE_PRODUCTS }),
          transformer: (data) => simulatedBuildings.filter((b) => !!b.Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE))
        },
      );
      console.log({ simulatedBuildings })
    }

    return configs.map((c) => ({ ...c, key: JSON.stringify(c.queryKey) }));
  }, [simulation]);

  console.log('configs', overwrites);

  // entity
  // entities collections (where relevant to tutorial and data)
  // special ones





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