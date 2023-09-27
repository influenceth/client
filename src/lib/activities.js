import { Entity } from '@influenceth/sdk';
import EntityName from '~/components/EntityName';
import { ScanAsteroidIcon } from '~/components/Icons';

// useQuery cache keys:
// [ 'actionItems', crew?.i ],
// [ 'activities', entity.label, entity.id ],
// [ 'asteroidLots', asteroid?.i ],  // TODO: two of these references
// [ 'asteroidCrewLots', asteroidId, crewId ],
// [ 'asteroidCrewSampledLots', asteroidId, resourceId, crew?.i ],
// [ 'crewLocation', id ],
// [ 'planned', crew?.i ],
// [ 'priceConstants' ],
// [ 'referrals', 'count', token ],
// [ 'user', token ],
// [ 'watchlist', token ],

// [ 'entities', Entity.IDS.ASTEROID, 'owned', account ],
// [ 'entities', Entity.IDS.ASTEROID, 'controlled', crew?.id ],
// [ 'entities', Entity.IDS.CREW, 'owned', account ],
// [ 'entities', Entity.IDS.CREW, 'ship', shipId ],
// [ 'entities', Entity.IDS.CREWMATE, ids.join(',') ],
// [ 'entities', Entity.IDS.CREWMATE, 'owned', account ],
// [ 'entities', Entity.IDS.CREWMATE, 'uninitialized', account ],
// [ 'entities', Entity.IDS.SHIP, 'asteroid', i ],
// [ 'entities', Entity.IDS.SHIP, 'owned', useCrewId ],
// [ 'entity', Entity.IDS.ASTEROID, id ],
// [ 'entity', Entity.IDS.CREWMATE, id ],
// [ 'entity', Entity.IDS.BUILDING, id ],
// [ 'entity', Entity.IDS.CREW, id ],
// [ 'entity', Entity.IDS.LOT, `${asteroidId}_${lotId}` ],
// [ 'entity', Entity.IDS.SHIP, id ],

// [ 'search', assetType, query ],


// TODO: move toward entity-based cache naming
// ['entity', label, id]
// ['entities', label, query/queryLabel, data ] --> should mutate individual results in above value
//                                                  (and then return a reference to those individual results)
// (...special stuff)


// TODO (enhancement): some of the invalidations may be overkill by using this
const invalidationDefaults = (label, id) => {
  const i = [];
  i.push(['entities', label]);
  if (id) i.push(['entity', label, id]);

  // TODO: convert search keys to entity-based labels
  let searchKey;
  if (label === Entity.IDS.ASTEROID) searchKey = 'asteroids';
  if (label === Entity.IDS.BUILDING) searchKey = 'buildings';
  if (label === Entity.IDS.CREW) searchKey = 'crews';
  if (label === Entity.IDS.CREWMATE) searchKey = 'crewmates';
  if (label === Entity.IDS.DEPOSIT) searchKey = 'deposits';
  if (label === Entity.IDS.ORDER) searchKey = 'orders';
  if (label === Entity.IDS.SHIP) searchKey = 'ships';
  if (searchKey) i.push(['search', searchKey]);

  // TODO: if finishTime, add ActionItems to invalidations?

  return i;
};

const activities = {
  // AddedToWhitelist,
  AsteroidInitialized: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
  },
  AsteroidManaged: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
  },
  AsteroidPurchased: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
  },
  BridgeFromStarknet: {},
  BridgeToStarknet: {},
  BridgedFromL1: {},
  BridgedToL1: {},
  // ConstructionFinished,
  // ConstructionPlanned,
  CrewDelegated: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id)
  },
  CrewFormed: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.CREW)
  },
  CrewmatePurchased: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.CREWMATE)
  },
  CrewmateRecruited: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.CREWMATE, returnValues.crewmate.id),
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.station.id), // station population
    ])
  },
  CrewmateRecruitedV1: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.CREWMATE, returnValues.crewmate.id),
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.station.id) // station population
    ])
  },
  CrewmateTransferred: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.CREWMATE, returnValues.crewmate.id),
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
    ])
  },
  CrewmatesArranged: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id)
  },
  CrewmatesExchanged: {
    getInvalidations: ({ returnValues }) => ([
      [ 'entities', Entity.IDS.CREW, 'owned' ],  // in case created a crew
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.crew1.id),
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.crew2.id),
    ])
  },
  CrewStationed: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.station.id)
    ])
  },
  // DeliveryStarted,
  // DockShip,
  // EarlyAdopterRewardClaimed,
  // FoodSupplied,
  // MaterialProcessingFinished,
  // MaterialProcessingStarted,
  NameChanged: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(returnValues.entity.label, returnValues.entity.id),
      ['activities'], // (to update name in already-fetched activities)
      ['watchlist']
    ])
  },
  // OrderCreated,
  // PrepaidPolicyAssigned,
  // PrepaidPolicyRemoved,
  // PublicPolicyAssigned,
  // RemovedFromWhitelist,
  // ResourceExtractionFinished,
  // ResourceExtractionStarted,
  // ResourceScanFinished,
  // ResourceScanStarted,
  // SaleOffered,
  // SamplingDepositFinished,
  // SamplingDepositStarted,
  SurfaceScanFinished: {
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ])
  },
  SurfaceScanStarted: {
    getActionItem: ({ returnValues }) => ({
      icon: <ScanAsteroidIcon />,
      label: 'Asteroid Surface Scan',
      asteroidId: returnValues.asteroid.id,
      onClick: ({ history }) => {
        history.push(`/asteroids/${returnValues.asteroid.id}/resources`);
      }
    }),
    hideActionItem: ({ returnValues }) => (pendingTransactions) => {
      console.log({ returnValues, pendingTransactions });
      return pendingTransactions.find((tx) => (
        tx.key === 'ScanSurfaceFinish'
        && tx.vars.asteroid.id === returnValues.asteroid.id
      ))
    },
    getInvalidations: ({ returnValues }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ])
  },
  // ShipAssemblyFinished,
  // ShipAssemblyStarted,
  // ShipCommandeered,
  // ShipDocked,
  Transfer: {
    getInvalidations: ({ returnValues }) => invalidationDefaults(returnValues.entity.label, returnValues.entity.id),
  },
  // TransitStarted
};

const getActivityConfig = (activity) => {
  const name = activity.event?.event;
  if (!activities[name]) {
    console.warn(`No activity config for ${name}`);
    return null;
  }
  const {
    getActionItem,
    getInvalidations,
    getLogContent,
    hideActionItem,
    ...config
  } = activities[name];
  return {
    ...config,
    getActionItem: () => getActionItem ? getActionItem(activity.event) : null,
    hideActionItem: hideActionItem ? hideActionItem(activity.event) : () => false,
    getInvalidations: () => getInvalidations ? getInvalidations(activity.event) : [],
    getLogContent: () => getLogContent ? getLogContent(activity.event) : null,
  };
}

export default getActivityConfig;


// TODO: remove old invalidations below when no longer need the reference

// Dispatcher_ConstructionPlan: [
//   ['planned'],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
// ],
// Dispatcher_ConstructionUnplan: [
//   ['planned'],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
// ],
// Dispatcher_ConstructionStart: [
//   ['planned'],
//   ['actionItems'],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
// ],
// Dispatcher_ConstructionFinish: [
//   ['actionItems'],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
// ],
// Dispatcher_ConstructionDeconstruct: [
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
// ],

// Dispatcher_CoreSampleStartSampling: [
//   ['actionItems'],
//   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
// ],
// Dispatcher_CoreSampleFinishSampling: [
//   ['actionItems'],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
// ],
// // (invalidations done in extractionStart)
// // CoreSample_Used: [
// //   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, getLinkedAsset(linked, 'Crew').i],
// //   ['lots', returnValues.asteroidId, returnValues.lotId],
// // ],
// Dispatcher_ExtractionStart: [
//   ['actionItems'],
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
//   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
//   ['lots', returnValues.asteroidId, returnValues.lotId],
//   // ['lots', returnValues.asteroidId, returnValues.destinationLotId] // (this should happen in inventory_changed)
// ],
// Dispatcher_ExtractionFinish: [
//   ['actionItems'],
//   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
//   ['lots', returnValues.asteroidId, returnValues.lotId]
// ],

// Inventory_DeliveryStarted: [
//   ['actionItems'],
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
// ],
// Inventory_DeliveryFinished: [
//   ['actionItems'],
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
// ],
// Inventory_ReservedChanged: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
//   ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
// ],
// Inventory_Changed: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
//   ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
// ],


// hiders:

// switch (item.event.name) {
//   case 'Dispatcher_AsteroidStartScan':
//     return !pendingTransactions.find((tx) => (
//       tx.key === 'FINISH_ASTEROID_SCAN'
//       && tx.vars.i === item.event.returnValues?.asteroidId
//     ));
//   case 'Dispatcher_CoreSampleStartSampling':
//     return !pendingTransactions.find((tx) => (
//       tx.key === 'FINISH_CORE_SAMPLE'
//       && tx.vars.asteroidId === item.event.returnValues?.asteroidId
//       && tx.vars.lotId === item.event.returnValues?.lotId
//     ));
//   case 'Dispatcher_ConstructionStart':
//     return !pendingTransactions.find((tx) => (
//       tx.key === 'FINISH_CONSTRUCTION'
//       && tx.vars.asteroidId === item.assets.asteroid.i
//       && tx.vars.lotId === item.assets.lot.i
//     ));
//   case 'Dispatcher_ExtractionStart':
//     return !pendingTransactions.find((tx) => (
//       tx.key === 'FINISH_EXTRACTION'
//       && tx.vars.asteroidId === item.event.returnValues?.asteroidId
//       && tx.vars.lotId === item.event.returnValues?.lotId
//     ));
//   case 'Dispatcher_InventoryTransferStart':
//     return !pendingTransactions.find((tx) => (
//       tx.key === 'FINISH_DELIVERY'
//       && tx.vars.asteroidId === item.event.returnValues?.asteroidId
//       && tx.vars.destLotId === item.event.returnValues?.destinationLotId
//       && tx.vars.deliveryId === item.assets.delivery?.deliveryId
//     ));
// }