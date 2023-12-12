import { Address, Building, Entity, Lot, Process, Product } from '@influenceth/sdk';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { BiTransfer as TransferIcon } from 'react-icons/bi';

import AddressLink from '~/components/AddressLink';
import EntityLink from '~/components/EntityLink';
import {
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  CrewmateIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  KeysIcon,
  NewCoreSampleIcon,
  PlanBuildingIcon,
  ProcessIcon,
  PromoteIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  StationCrewIcon,
  SurfaceTransferIcon,
  UnplanBuildingIcon
} from '~/components/Icons';
import LotLink from '~/components/LotLink';

import { andList, getProcessorProps, locationsArrToObj, ucfirst } from './utils';
import api from './api';
import formatters from './formatters';

const addressMaxWidth = '100px';

const getNamedAddress = (address) => {
  if (Address.areEqual(address, process.env.REACT_APP_STARKNET_ASTEROID_TOKEN)) return 'the Asteroid Bridge';
  else if (Address.areEqual(address, process.env.REACT_APP_STARKNET_CREWMATE_TOKEN)) return 'the Crewmate Bridge';
}

const getEntityName = (entity) => {
  if (!entity) return '';
  switch (entity.label) {
    case Entity.IDS.CREW: return formatters.crewName(entity);
    case Entity.IDS.CREWMATE: return formatters.crewmateName(entity);
    case Entity.IDS.ASTEROID: return formatters.asteroidName(entity);
    case Entity.IDS.LOT: return formatters.lotName(Lot.toIndex(entity.id));
    case Entity.IDS.BUILDING: return formatters.buildingName(entity);
    case Entity.IDS.SHIP: return formatters.shipName(entity);
    default: return '';
  }
};

// TODO: instead of guessing at what should be invalidated with each event,
//  should we just have a more standard invalidation on ComponentUpdated
//  (that also travels up to lot since lot is an aggregation)
// ... would need to emit these from the server to the relevant crew and asteroid rooms


// TODO (enhancement): some of the invalidations may be overkill by using this
const invalidationDefaults = (label, id) => {
  const i = [];

  // the specific affected record (and its activities)
  // NOTE: 'entity' invalidation will also invalidate any ['entities', label, *] groups where find id
  if (id) {
    i.push(['entity', label, id]);
    i.push(['activities', label, id]);

  // if no id included, dump all group queries
  } else {
    i.push(['entities', label]);
  }

  // search results that might included the affected record
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

  // TODO: if finishTime, add ActionItems to invalidations? if getActionItem entry?
  //  these work for Start event, but not finish, so probably better to do explicitly
  //  so the invalidation isn't forgotten

  return i;
};

// TODO: write a test to make sure all activities (from sdk) have a config
const activities = {
  // AddedToWhitelist,

  AsteroidInitialized: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
  },

  AsteroidManaged: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <KeysIcon />,
      content: (
        <>
          <EntityLink {...returnValues.callerCrew} />
          {' '}granted management rights for <EntityLink {...returnValues.asteroid} />
        </>
      ),
    }),
  },

  AsteroidPurchased: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <PurchaseAsteroidIcon />,
      content: (
        <>
          Asteroid <EntityLink {...returnValues.asteroid} />
          {' '}purchased by <AddressLink address={returnValues.caller} maxWidth={addressMaxWidth} />
        </>
      ),
    }),
    triggerAlert: true
  },

  AsteroidScanned: {
    getLogContent: ({ event: { returnValues } }) => {
      const entity = { label: Entity.IDS.ASTEROID, id: returnValues.asteroidId };

      return {
        icon: <ScanAsteroidIcon />,
        content: (
          <>
            Long-range surface scan completed on asteroid
            {' '}<EntityLink {...entity} />
          </>
        )
      };
    }
  },

  // TODO: do any of these need invalidations or logs?
  //  ^ or some specialized version of an actionitem
  BridgeFromStarknet: {},
  BridgeToStarknet: {},
  BridgedFromL1: {},
  BridgedToL1: {},

  ConstructionPlanned: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
      ['planned'],
      ['asteroidCrewBuildings', returnValues.asteroid.id, returnValues.callerCrew.id],
    ]),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <PlanBuildingIcon />,
      content: (
        <>
          <span>{Building.TYPES[returnValues.buildingType]?.name} site plan created for </span>
          <LotLink lotId={returnValues.lot.id} />
        </>
      ),
    }),
    requiresCrewTime: true
  },

  ConstructionAbandoned: {
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const { asteroidId } = locationsArrToObj(building?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
        ['planned'],
        // ['asteroidLots', asteroidId], (handled by asteroid room connection now)
        ['asteroidCrewBuildings', asteroidId, returnValues.callerCrew.id],
      ]
    },
    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => ({
      icon: <UnplanBuildingIcon />,
      content: (
        <>
          <span>Construction plans abandoned on </span>
          <LotLink lotId={locationsArrToObj(building?.Location?.locations || [])?.lotId} />
        </>
      ),
    }),
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),
  },

  ConstructionStarted: {
    getActionItem: ({ returnValues }, { building = {} }) => {
      const { asteroidId, lotId, lotIndex } = locationsArrToObj(building?.Location?.locations || []) || {};
      return {
        icon: <ConstructIcon />,
        label: `${Building.TYPES[building?.Building?.buildingType]?.name || 'Building'} Construction`,
        asteroidId,
        lotId,
        locationDetail: lotIndex ? formatters.lotName(lotIndex) : undefined,
        onClick: ({ openDialog }) => {
          openDialog('CONSTRUCT');
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'ConstructionFinish'
        && tx.vars.building.id === returnValues.building.id
      ))
    },
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const invs = [
        ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
        ['planned'],
        ['actionItems'],
      ];

      const _location = locationsArrToObj(building?.Location?.locations || []);
      if (_location.asteroidId) {
        invs.push(['asteroidCrewBuildings', _location.asteroidId, returnValues.callerCrew.id]);
      }
      return invs;
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),
    requiresCrewTime: true
  },
  
  ConstructionFinished: {
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const { asteroidId } = locationsArrToObj(building?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
        ['actionItems'],
        ['asteroidCrewBuildings', asteroidId, returnValues.callerCrew.id],
      ]
    },
    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => {
      console.log('GET LOG CONTENT', returnValues, building, locationsArrToObj(building?.Location?.locations || [])?.lotId);
      return {
        icon: <ConstructIcon />,
        content: (
          <>
            <span>{Building.TYPES[building?.Building?.buildingType]?.name || 'Building'} construction finished on </span>
            <LotLink lotId={locationsArrToObj(building?.Location?.locations || [])?.lotId} />
          </>
        ),
      };
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),
    triggerAlert: true
  },

  ConstructionDeconstructed: {
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const { asteroidId } = locationsArrToObj(building?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
        ['asteroidCrewBuildings', asteroidId, returnValues.callerCrew.id],
      ]
    },
    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => ({
      icon: <ConstructIcon />,
      content: (
        <>
          <span>{Building.TYPES[building?.Building?.buildingType]?.name || 'Building'} deconstructed on </span>
          <LotLink lotId={locationsArrToObj(building?.Location?.locations || [])?.lotId} />
        </>
      ),
    }),
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),
    requiresCrewTime: true
  },

  CrewDelegated: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.CREW, returnValues.crew.id),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <CrewIcon />,
      content: (
        <>
          <EntityLink {...returnValues.crew} />
          {' '}delegated to <AddressLink address={returnValues.delegatedTo} maxWidth={addressMaxWidth} />
        </>
      ),
    }),
    triggerAlert: true
  },

  CrewFormed: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.CREW),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <CrewIcon />,
      content: (
        <>
          <EntityLink {...returnValues.callerCrew} />
          {' '}was formed by <AddressLink address={returnValues.caller} maxWidth={addressMaxWidth} />
        </>
      ),
    }),
    triggerAlert: true
  },

  CrewmatePurchased: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.CREWMATE),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <CrewmateIcon />,
      content: (
        <>
          <EntityLink {...returnValues.crewmate} /> purchased by
          {' '}<AddressLink address={returnValues.caller} maxWidth={addressMaxWidth} />
        </>
      ),
    }),
    triggerAlert: true
  },

  CrewmateRecruited: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
      ...invalidationDefaults(Entity.IDS.CREWMATE, returnValues.crewmate.id),
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.station.id) // station population
    ]),
    // v0 and v1 are the same content
    getLogContent: ({ event: { returnValues, version } }) => ({
      icon: <CrewmateIcon />,
      content: (
        <>
          <EntityLink {...returnValues.crewmate} /> recruited to
          {' '}<EntityLink {...returnValues.callerCrew} />
        </>
      ),
    }),
    triggerAlert: true
  },

  CrewmatesArranged: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
    getLogContent: ({ event: { returnValues, version } }, viewingAs = {}) => {
      if (version === 0) {
        // v0 does not have oldCrew included, so this is presumptive and potentially inaccurate
        const newCaptain = returnValues.composition?.[0];
        if (!newCaptain) return null;
        return {
          icon: <PromoteIcon />,
          content: (
            <>
              <EntityLink label={Entity.IDS.CREWMATE} id={newCaptain} />
              {' '}promoted to Captain of <EntityLink {...returnValues.callerCrew} />
            </>
          ),
        };
      }

      // v1: ...
      const newCaptain = returnValues.compositionNew[0];
      const oldCaptain = returnValues.compositionOld[0];

      // if captain changed
      if (newCaptain !== oldCaptain) {

        // if viewingAs crew or new captain, show promotion
        if (newCaptain && (viewingAs.label === Entity.IDS.CREW || (viewingAs.label === Entity.IDS.CREWMATE && viewingAs.id === newCaptain))) {
          return {
            icon: <PromoteIcon />,
            content: (
              <>
                <EntityLink label={Entity.IDS.CREWMATE} id={newCaptain} />
                {' '}promoted to Captain of <EntityLink {...returnValues.callerCrew} />
              </>
            ),
          };

        // else if viewingAs crew or old captain, show promotion
        } else if (oldCaptain && (viewingAs.label === Entity.IDS.CREW || (viewingAs.label === Entity.IDS.CREWMATE && viewingAs.id === oldCaptain))) {
          return {
            icon: <CrewmateIcon />,
            content: (
              <>
                <EntityLink label={Entity.IDS.CREWMATE} id={newCaptain} />
                {' '}relieved of command of <EntityLink {...returnValues.callerCrew} />
              </>
            ),
          };
        }
      }
      return null;
    }
  },

  CrewmatesExchanged: {
    getInvalidations: ({ event: { returnValues } }) => ([
      [ 'entities', Entity.IDS.CREW, 'owned' ],  // in case created a crew
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.crew1.id),
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.crew2.id),
    ]),
    getLogContent: ({ event: { returnValues } }, viewingAs = {}) => {
      const crew1CompositionOld = returnValues.crew1CompositionOld.map(({ id }) => id);
      const crew2CompositionOld = returnValues.crew2CompositionOld.map(({ id }) => id);
      const crew1CompositionNew = returnValues.crew1CompositionNew.map(({ id }) => id);
      const crew2CompositionNew = returnValues.crew2CompositionNew.map(({ id }) => id);

      const to1 = crew1CompositionNew.filter((id) => crew2CompositionOld.includes(id));
      const to2 = crew2CompositionNew.filter((id) => crew1CompositionOld.includes(id));

      if (viewingAs.label === Entity.IDS.CREW) {
        const toCrew = viewingAs.id === returnValues.crew1.id ? returnValues.crew1 : returnValues.crew2;
        const fromCrew = viewingAs.id === returnValues.crew1.id ? returnValues.crew2 : returnValues.crew1;
        const toList = viewingAs.id === returnValues.crew1.id ? to1 : to2;
        const fromList = viewingAs.id === returnValues.crew1.id ? to2 : to1;
        return {
          icon: <CrewIcon />,
          content: (
            <>
              {toList.length > 0 && fromList.length > 0 && (
                <>
                  {andList(toList.map((id) => <EntityLink key={id} label={Entity.IDS.CREWMATE} id={id} />))}
                  {' '}recruited from <EntityLink {...fromCrew} /> in exchange for
                  {' '}{andList(fromList.map((id) => <EntityLink key={id} label={Entity.IDS.CREWMATE} id={id} />))}
                </>
              )}
              {toList.length > 0 && fromList.length === 0 && (
                <>
                  {andList(toList.map((id) => <EntityLink key={id} label={Entity.IDS.CREWMATE} id={id} />))}
                  {' '}transferred from <EntityLink {...fromCrew} />{' '}
                  {' '}to <EntityLink {...toCrew} />
                </>
              )}
              {fromList.length > 0 && toList.length === 0 && (
                <>
                  {andList(fromList.map((id) => <EntityLink key={id} label={Entity.IDS.CREWMATE} id={id} />))}
                  {' '}transferred from <EntityLink {...toCrew} />
                  {' '}to <EntityLink {...fromCrew} />
                </>
              )}
            </>
          ),
        };

      } else if (viewingAs.label === Entity.IDS.CREWMATE) {
        const wasCaptain = viewingAs.id === crew1CompositionOld[0] ? 'crew1' : (viewingAs.id === crew2CompositionOld[0] ? 'crew2' : '');
        const isCaptain = viewingAs.id === crew1CompositionNew[0] ? 'crew1' : (viewingAs.id === crew2CompositionNew[0] ? 'crew2' : '');
        const wasCrew = crew1CompositionOld.includes(viewingAs.id) ? 'crew1' : 'crew2';
        const isCrew = crew1CompositionNew.includes(viewingAs.id) ? 'crew1' : 'crew2';

        if (isCaptain && isCaptain !== wasCaptain) {
          return {
            icon: <PromoteIcon />,
            content: (
              <>
                <EntityLink label={Entity.IDS.CREWMATE} id={viewingAs.id} />
                {isCrew !== wasCrew && <>{' '}transferred from <EntityLink {...returnValues[wasCrew]} /> and</>}
                {' '}promoted to Captain of <EntityLink {...returnValues[isCaptain]} />
              </>
            )
          };
        } else if (wasCaptain && isCaptain !== wasCaptain) {
          return {
            icon: <CrewIcon />,
            content: (
              <>
                <EntityLink label={Entity.IDS.CREWMATE} id={viewingAs.id} />
                {' '}relieved of command of <EntityLink {...returnValues[wasCaptain]} />
                {isCrew !== wasCrew && <>{' '}and transferred to <EntityLink {...returnValues[isCrew]} /></>}
              </>
            )
          };
        } else if (isCrew !== wasCrew) {
          return {
            icon: <CrewIcon />,
            content: (
              <>
                <EntityLink label={Entity.IDS.CREWMATE} id={viewingAs.id} /> transferred
                {' '}from <EntityLink {...returnValues[wasCrew]} />
                {' '}to <EntityLink {...returnValues[isCrew]} />
              </>
            )
          };
        }
      }
      return null;
    }
  },

  CrewStationed: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
      ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.station.id)
    ]),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <StationCrewIcon />,
      content: (
        <>
          Crew <EntityLink {...returnValues.callerCrew} />
          {' '}stationed in <EntityLink {...returnValues.station} />
        </>
      ),
    }),
    requiresCrewTime: true
  },
  
  DeliveryFinished: {
    getInvalidations: ({ event: { returnValues } }, { delivery = {} }) => {
      const invs = [
        ...invalidationDefaults(Entity.IDS.DELIVERY, returnValues.delivery?.id),
        ['actionItems']
      ];

      if (delivery?.Delivery) {
        invs.unshift(...invalidationDefaults(delivery.Delivery.origin.label, delivery.Delivery.origin.id));
        invs.unshift(...invalidationDefaults(delivery.Delivery.dest.label, delivery.Delivery.dest.id));
      }

      return invs;
    },
    getLogContent: (activity, viewingAs, { delivery }) => {
      if (!delivery) return null;
      return {
        icon: <SurfaceTransferIcon />,
        content: (
          <>
            <span>Delivery completed to </span> <EntityLink {...delivery.Delivery.dest} />
          </>
        ),
      };
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      delivery: returnValues.delivery,
    }),
    triggerAlert: true
  },

  DeliveryStarted: {
    getActionItem: ({ returnValues }, { destination = {} }) => {
      const _location = locationsArrToObj(destination?.Location?.locations || []);
      return {
        icon: <SurfaceTransferIcon />,
        label: 'Surface Transfer',
        asteroidId: _location.asteroidId,
        lotId: _location.lotId,
        locationDetail: getEntityName(destination),
        onClick: ({ openDialog }) => {
          openDialog('SURFACE_TRANSFER', { deliveryId: returnValues.delivery.id });
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'TransferInventoryFinish'
        && tx.vars.delivery.id === returnValues.delivery.id
      ))
    },

    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DELIVERY, returnValues.delivery.id),
      ...invalidationDefaults(returnValues.dest.label, returnValues.dest.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ['actionItems']
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      destination: returnValues.dest,
      // origin: returnValues.origin,
    }),

    // getLogContent: (activity, viewingAs, { destination = {} }) => {
    //   const _location = locationsArrToObj(destination?.Location?.locations || []);
    //   return {
    //     icon: <SurfaceTransferIcon />,
    //     content: (
    //       <>
    //         <span>Delivery started to </span>
    //         <EntityLink {...activity.returnValue.dest} />
    //         {_location.lotId && <>at<LotLink lotId={_location.lotId} /></>}
    //       </>
    //     ),
    //   };
    // },

    requiresCrewTime: true
  },

  // DockShip,
  // EarlyAdopterRewardClaimed,
  // FoodSupplied,
  // MaterialProcessingFinished,
  // MaterialProcessingStarted,

  MaterialProcessingStarted: {
    getActionItem: ({ returnValues }, { building = {} }) => {
      const _location = locationsArrToObj(building?.Location?.locations || []);
      const process = Process.TYPES[returnValues.process];
      const processorProps = getProcessorProps(process?.processorType);
      return {
        icon: processorProps?.icon || <ProcessIcon />,
        label: processorProps?.label || 'Running Process',
        asteroidId: _location.asteroidId,
        lotId: _location.lotId,
        locationDetail: getEntityName(building),
        onClick: ({ openDialog }) => {
          openDialog('PROCESS', { processorSlot: returnValues.processorSlot });
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'MaterialProcessingFinished'
        && tx.vars.processor.id === returnValues.processor.id
        && tx.vars.processor_slot === returnValues.processor_slot
      ))
    },

    getInvalidations: ({ event: { returnValues, version } }) => {
      const inv = [
        ...invalidationDefaults(returnValues.processor.label, returnValues.processor.id),
        ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
        ['actionItems']
      ];

      // (v1 only)
      if (returnValues.origin) inv.unshift(...invalidationDefaults(returnValues.origin.label, returnValues.origin.id));

      // TODO: do we need this for building status?
      // ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],
      return inv;
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.processor,
    }),

    // getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => {
    //   const _location = locationsArrToObj(building?.Location?.locations || []);
    //   const process = Process.TYPES[returnValues.process];
    //   const processorProps = getProcessorProps(process?.processorType);
    //   return {
    //     icon: processorProps?.icon || <ProcessIcon />,
    //     content: (
    //       <>
    //         <span>{process?.name || processorProps?.label || 'Process'} started at </span>
    //         <LotLink lotId={_location.lotId} />
    //       </>
    //     ),
    //   };
    // },

    requiresCrewTime: true
  },
  MaterialProcessingFinished: {
    getInvalidations: ({ event: { returnValues, version } }, { building = {} }) => {

      const invs = [
        ...invalidationDefaults(returnValues.processor.label, returnValues.processor.id),
        ['actionItems']
      ];

      const processor = (building?.Processors || []).find((p) => p.slot === returnValues.processorSlot);
      if (processor?.destination) invs.unshift(...invalidationDefaults(processor.destination.label, processor.destination.id));

      // TODO: do we need this for building status?
      // ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],

      return invs;
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      // destination: returnValues.destination,
      building: returnValues.processor,
    }),

    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => {
      const _location = locationsArrToObj(building?.Location?.locations || []);
      const process = Process.TYPES[returnValues.process];
      const processorProps = getProcessorProps(process?.processorType);
      return {
        icon: processorProps?.icon || <ProcessIcon />,
        content: (
          <>
            <span>{process?.name || processorProps?.label || 'Process'} completed at </span>
            <LotLink lotId={_location.lotId} />
          </>
        ),
      };
    },

    triggerAlert: true
  },

  NameChanged: {
    getInvalidations: ({ event: { returnValues } }) => {
      let invalidation;

      if (returnValues.entity) {
        invalidation = invalidationDefaults(returnValues.entity.label, returnValues.entity.id);
      } else if (returnValues.asteroidId) {
        invalidation = invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroidId);
      } else if (returnValues.crewId) {
        invalidation = invalidationDefaults(Entity.IDS.CREWMATE, returnValues.crewId);
      }

      return [
        ...invalidation,
        ['activities'], // (to update name in already-fetched activities)
        ['watchlist']
      ];
    },
    getLogContent: ({ event: { returnValues } }) => {
      let entity;

      if (returnValues.entity) {
        entity = returnValues.entity;
      } else if (returnValues.asteroidId) {
        entity = { label: Entity.IDS.ASTEROID, id: returnValues.asteroidId };
      } else if (returnValues.crewId) {
        entity = { label: Entity.IDS.CREWMATE, id: returnValues.crewId };
      }

      return {
        icon: <NameIcon />,
        content: (
          <>
            {ucfirst(Entity.TYPES[entity?.label]?.label || '')}
            {' '}<EntityLink {...entity} forceBaseName />
            {' '}re-named to "{returnValues.name || returnValues.newName}"
          </>
        )
      };
    }
    // TODO: prepop as needed (i.e. if building name changed, to update lot)
  },

  ResourceExtractionStarted: {
    getActionItem: ({ returnValues }, { extractor = {} }) => {
      const _location = locationsArrToObj(extractor?.Location?.locations || []);
      return {
        icon: <ExtractionIcon />,
        label: `${Product.TYPES[returnValues?.resource]?.name || 'Resource'} Extraction`,
        asteroidId: _location.asteroidId,
        lotId: _location.lotId,
        // resourceId: returnValues.resource,
        locationDetail: getEntityName(extractor),
        onClick: ({ openDialog }) => {
          console.log({ returnValues, extractor });
          openDialog('EXTRACT_RESOURCE');
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'ResourceExtractionFinished'
        && tx.vars.extractor.id === returnValues.extractor.id
        && tx.vars.extractor_slot === returnValues.extractor_slot
      ))
    },

    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DEPOSIT, returnValues.deposit.id),
      ...invalidationDefaults(returnValues.extractor.label, returnValues.extractor.id),
      ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
      ['actionItems'],
      ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],
      ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      // destination: returnValues.destination,
      extractor: returnValues.extractor,
    }),

    // getLogContent: ({ event: { returnValues } }, viewingAs, { extractor = {} }) => {
    //   const _location = locationsArrToObj(extractor?.Location?.locations || []);
    //   return {
    //     icon: <ExtractionIcon />,
    //     content: (
    //       <>
    //         <span>{Product.TYPES[returnValues.resource]?.name || 'Resource'} extraction started at </span>
    //         <LotLink lotId={_location.lotId} />
    //       </>
    //     ),
    //   };
    // },

    requiresCrewTime: true
  },

  ResourceExtractionFinished: {
    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(returnValues.extractor.label, returnValues.extractor.id),
      ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
      ['actionItems'],
      ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      // destination: returnValues.destination,
      extractor: returnValues.extractor,
    }),

    getLogContent: ({ event: { returnValues } }, viewingAs, { extractor = {} }) => {
      return {
        icon: <ExtractionIcon />,
        content: (
          <>
            <span>{Product.TYPES[returnValues.resource]?.name || 'Resource'} extraction completed at </span>
            <LotLink lotId={locationsArrToObj(extractor?.Location?.locations || []).lotId} />
          </>
        ),
      };
    },

    triggerAlert: true
  },

  // OrderCreated,
  // PrepaidPolicyAssigned,
  // PrepaidPolicyRemoved,
  // PublicPolicyAssigned,
  // RemovedFromWhitelist,
  // SaleOffered,

  ResourceScanFinished: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ]),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <ScanAsteroidIcon />,
      content: (
        <>
          Orbital surface scan completed on asteroid
          {' '}<EntityLink {...returnValues.asteroid} />
        </>
      )
    }),
    triggerAlert: true
  },

  ResourceScanStarted: {
    getActionItem: ({ returnValues }) => ({
      icon: <ScanAsteroidIcon />,
      label: 'Orbital Scan',
      asteroidId: returnValues.asteroid.id,
      onClick: ({ history }) => {
        history.push(`/asteroids/${returnValues.asteroid.id}/resources`);
      }
    }),
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'ScanResourcesFinish'
        && tx.vars.asteroid.id === returnValues.asteroid.id
      ))
    },
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ]),
    // getLogContent: ({ event: { returnValues } }) => ({
    //   icon: <ScanAsteroidIcon />,
    //   content: (
    //     <>
    //       <span>Orbital surface scan initiated on asteroid </span>
    //       <EntityLink {...returnValues.asteroid} />
    //     </>
    //   ),
    // }),
  },

  SamplingDepositFinished: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.DEPOSIT, returnValues.deposit?.id),
      ['actionItems']
    ]),
    getLogContent: (activity, viewingAs, { deposit = {} }) => {
      const _location = locationsArrToObj(deposit?.Location?.locations || []);
      return {
        icon: <CoreSampleIcon />,
        content: (
          <>
            <span>{Product.TYPES[deposit.Deposit?.resource]?.name} core sample analyzed at </span>
            <LotLink lotId={_location.lotId} resourceId={deposit.Deposit?.resource} />
          </>
        ),
      };
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      deposit: { label: Entity.IDS.DEPOSIT, id: returnValues.deposit?.id }
    }),
    triggerAlert: true
  },

  SamplingDepositStarted: {
    getActionItem: ({ returnValues }) => ({
      icon: returnValues.improving ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />,
      label: `Core ${returnValues.improving ? 'Improvement' : 'Sample'}`,
      asteroidId: Lot.toPosition(returnValues.lot.id)?.asteroidId,
      lotId: returnValues.lot.id,
      resourceId: returnValues.resource,
      locationDetail: Product.TYPES[returnValues.resource].name,
      onClick: ({ openDialog }) => {
        openDialog(returnValues.improving ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      }
    }),
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'SampleDepositFinish'
        && tx.vars.deposit.id === returnValues.deposit.id
      ));
    },
    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DEPOSIT, returnValues.deposit.id), // (not sure this exists)
      ...(version > 0 ? invalidationDefaults(returnValues.origin.label, returnValues.origin.id) : []), // source inventory
      ['actionItems'],
      ['asteroidCrewSampledLots', Lot.toPosition(returnValues.lot.id)?.asteroidId, returnValues.resource],
    ]),
    // getLogContent: ({ event: { returnValues } }) => {
    //   return {
    //     icon: returnValues.improving ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />,
    //     content: (
    //       <>
    //         <span>{Product.TYPES[e.returnValues.resource]?.name} core sample {returnValues.improving ? 'improvement ' : ' '}started at </span>
    //         <LotLink lotId={e.returnValues.lotId} resourceId={e.returnValues.resource} />
    //       </>
    //     ),
    //   };
    // },
    requiresCrewTime: true
  },

  SurfaceScanFinished: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ]),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <ScanAsteroidIcon />,
      content: (
        <>
          Long-range surface scan completed on asteroid
          {' '}<EntityLink {...returnValues.asteroid} />
        </>
      )
    }),
    triggerAlert: true
  },

  SurfaceScanStarted: {
    getActionItem: ({ returnValues }) => ({
      icon: <ScanAsteroidIcon />,
      label: 'Long-Range Surface Scan',
      asteroidId: returnValues.asteroid.id,
      onClick: ({ history }) => {
        history.push(`/asteroids/${returnValues.asteroid.id}/resources`);
      }
    }),
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'ScanSurfaceFinish'
        && tx.vars.asteroid.id === returnValues.asteroid.id
      ))
    },
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
      ['actionItems'],
      ['watchlist']
    ]),
    // getLogContent: ({ event: { returnValues } }) => ({
    //   icon: <ScanAsteroidIcon />,
    //   content: (
    //     <>
    //       <span>Long-range surface scan initiated on asteroid </span>
    //       <EntityLink {...returnValues.asteroid} />
    //     </>
    //   ),
    // }),
  },

  // ShipAssemblyFinished,
  // ShipAssemblyStarted,
  // ShipCommandeered,
  // ShipDocked,

  Transfer: {
    getInvalidations: ({ entities, event: { returnValues } }) => {
      if (!entities?.[0]?.label) return [];
      return invalidationDefaults(entities[0].label, entities[0].id)
    },
    getLogContent: ({ entities, event: { returnValues } }) => {
      if (!entities?.[0]?.label) {
        return {
          icon: <TransferIcon />,
          content: <>Transfer complete.</>
        }
      }

      const entity = entities[0];

      if (parseInt(returnValues.from) === 0) {
        return {
          icon: <TransferIcon />,
          content: (
            <>
              {/*ucfirst(Entity.TYPES[entity?.label]?.label || '')*/}
              {' '}<EntityLink {...entity} /> minted to
              {' '}<AddressLink address={returnValues.to} maxWidth={addressMaxWidth} />
            </>
          ),
        };
      }

      let namedFrom = getNamedAddress(returnValues.from);
      let namedTo = getNamedAddress(returnValues.to);
      return {
        icon: <TransferIcon />,
        content: (
          <>
            {ucfirst(Entity.TYPES[entity?.label]?.label || '')}
            {' '}<EntityLink {...entity} /> transferred from
            {' '}{namedFrom || <AddressLink address={returnValues.from} maxWidth={addressMaxWidth} />}
            {' '}to {namedTo || <AddressLink address={returnValues.to} maxWidth={addressMaxWidth} />}
          </>
        ),
      };
    },
    triggerAlert: true
  },

  // TransitStarted
};

/**
 * Hydration and Prepopulation
 */
export const getHydrationQueryKey = ({ label, id }) => ['entity', label, id];

export const getAndCacheEntity = async ({ label, id }, queryClient) => {
  const queryKey = getHydrationQueryKey({ id, label });
  
  let data = queryClient.getQueryData(queryKey);
  if (!data) {
    data = await api.getEntityById({ label, id });
    if (data) queryClient.setQueryData(queryKey, data);
  }
  return data;
};

const prepopping = {};
export const hydrateActivities = async (newActivities, queryClient) => {
  return Promise.allSettled(
    newActivities.map((activity) => {
      const name = activity?.event?.name || activity?.event?.event;
      if (activities[name]?.getPrepopEntities) {
        const entities = activities[name].getPrepopEntities(activity) || {};
        return Promise.allSettled(
          Object.values(entities).filter((x) => !!x).map(({ id, label }) => new Promise((resolve) => {
            const queryKey = getHydrationQueryKey({ id, label });

            // if data is not yet available
            if (!queryClient.getQueryData(queryKey)) {
              const key = queryKey.join('_');
              // and not already prepopping
              if (!prepopping[key]) {
                // prepop it, then resolve
                prepopping[key] = true;
                return api.getEntityById({ label, id })
                  .then((data) => {
                    console.log({ label, id, data });
                    queryClient.setQueryData(queryKey, data);
                  })
                  .catch((e) => console.warn('Error with activity prepop', queryKey, e))
                  .finally(() => {
                    delete prepopping[key];
                    resolve(); // TODO: should resolve after entire loop
                  });
              }
            }
            // otherwise, go ahead and resolve
            resolve();
          }))
        )
      }
      return;
    })
  );
};

export const typesWithLogContent = Object.keys(activities).filter((type) => !!activities[type].getLogContent);

export default activities;


// TODO: remove references to old methods below when no longer need the reference

// useQuery cache keys:
// [ 'actionItems', crew?.id ],
// [ 'activities', entity.label, entity.id ],
// [ 'asteroidLots', asteroid?.id ],  // TODO: two of these references
// [ 'asteroidCrewBuildings', asteroidId, crewId ],
// [ 'asteroidCrewSampledLots', asteroidId, resourceId, crew?.id ],
// [ 'crewLocation', id ],
// [ 'planned', crew?.id ],
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
// [ 'entities', Entity.IDS.SHIP, 'asteroid', i ],
// [ 'entities', Entity.IDS.SHIP, 'owned', useCrewId ],
// [ 'entity', Entity.IDS.ASTEROID, id ],
// [ 'entity', Entity.IDS.CREWMATE, id ],
// [ 'entity', Entity.IDS.BUILDING, id ],
// [ 'entity', Entity.IDS.CREW, id ],
// [ 'entity', Entity.IDS.LOT, id ],
// [ 'entity', Entity.IDS.SHIP, id ],

// [ 'search', assetType, query ],


// TODO: move toward entity-based cache naming
// ['entity', label, id]
// ['entities', label, query/queryLabel, data ] --> should mutate individual results in above value
//                                                  (and then return a reference to those individual results)
// (...special stuff)

// TODO: old events that do not have a corresponding entry yet:
// Inventory_ReservedChanged: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').id, getLinkedAsset(linked, 'Lot').id],
//   ['asteroidCrewBuildings',  getLinkedAsset(linked, 'Asteroid').id, getLinkedAsset(linked, 'Crew').id],
// ],
// Inventory_Changed: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').id, getLinkedAsset(linked, 'Lot').id],
//   ['asteroidCrewBuildings',  getLinkedAsset(linked, 'Asteroid').id, getLinkedAsset(linked, 'Crew').id],
// ],
