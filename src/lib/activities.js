import { Address, Building, Entity, Lot, Process, Product, RandomEvent, Ship } from '@influenceth/sdk';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { BiTransfer as TransferIcon } from 'react-icons/bi';

import AddressLink from '~/components/AddressLink';
import EntityLink from '~/components/EntityLink';
import {
  ClaimRewardIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  CrewmateIcon,
  EjectPassengersIcon,
  EmergencyModeEnterIcon,
  EmergencyModeExitIcon,
  EmergencyModeCollectIcon,
  ExtractionIcon,
  FoodIcon,
  ImproveCoreSampleIcon,
  KeysIcon,
  LaunchShipIcon,
  NewCoreSampleIcon,
  PlanBuildingIcon,
  ProcessIcon,
  PromoteIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  ShipIcon,
  StationCrewIcon,
  SurfaceTransferIcon,
  UnplanBuildingIcon,
  SetCourseIcon,
  LimitBuyIcon,
  MarketSellIcon,
  LimitSellIcon,
  MarketBuyIcon,
  BecomeAdminIcon,
  EjectMyCrewIcon
} from '~/components/Icons';
import LotLink from '~/components/LotLink';

import { andList, formatPrice, getProcessorProps, locationsArrToObj, ucfirst } from './utils';
import api from './api';
import formatters from './formatters';
import EntityName from '~/components/EntityName';
import { formatResourceAmount, formatResourceMass } from '~/game/interface/hud/actionDialogs/components';
import { RandomEventIcon } from '~/components/AnimatedIcons';

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
    case Entity.IDS.LOT: return formatters.lotName(entity.id);
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
const invalidationDefaults = (labelOrEntity, optId) => {
  let label, id;
  if (!optId) {
    label = labelOrEntity.label;
    id = labelOrEntity.id;
  } else {
    label = labelOrEntity;
    id = optId;
  }
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

const getAgreementInvalidations = ({ event: { returnValues } }) => {
  return invalidationDefaults(returnValues.target);
};

const getPolicyInvalidations = ({ event: { returnValues } }) => {
  return invalidationDefaults(returnValues.entity || returnValues.target);
};

// TODO: write a test to make sure all activities (from sdk) have a config
const activities = {

  AsteroidInitialized: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
  },

  AsteroidManaged: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <BecomeAdminIcon />,
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

  BuildingRepossessed: {
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const loc = locationsArrToObj(building?.Location?.locations || []);
      return [
        ...invalidationDefaults(returnValues.building),
        ['planned'],  // TODO: only if a construction site
        ['asteroidCrewBuildings', loc.asteroidId, returnValues.callerCrew.id],
      ]
    }, // TODO: need to invalidate for the original crew (through asteroid ws?) AND trigger alert for them
    
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),

    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => {
      return {
        icon: <KeysIcon />,
        content: <>Repossessed <EntityLink label={Entity.IDS.LOT} id={building?.Location?.location?.id} /></>
      }
    },
  },

  BuyOrderCancelled: {
    getInvalidations: ({ event: { returnValues } }, { exchange = {} }) => {
      const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(returnValues.exchange),
        ...invalidationDefaults(returnValues.storage),
        [ 'swayBalance' ],
        [ 'crewOpenOrders' ],
        [ 'orderList', returnValues.product, returnValues.exchange.id ],
        [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
        [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
        [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      ];
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      exchange: returnValues.exchange,
    }),
  },
  BuyOrderCreated: {
    getInvalidations: ({ event: { returnValues } }, { exchange = {} }) => {
      const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(returnValues.exchange),
        ...invalidationDefaults(returnValues.storage),
        [ 'swayBalance' ],
        [ 'crewOpenOrders' ],
        [ 'orderList', returnValues.product, returnValues.exchange.id ],
        [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
        [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
        [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      ];
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      exchange: returnValues.exchange,
    }),

    requiresCrewTime: true
  },
  BuyOrderFilled: {
    // amount, buyerCrew, caller, callerCrew, exchange, origin, originSlot, price, product, storage, storageSlot
    getInvalidations: ({ event: { returnValues } }, { exchange = {} }) => {
      const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(returnValues.exchange),
        ...invalidationDefaults(returnValues.origin),
        ...invalidationDefaults(returnValues.storage),
        [ 'swayBalance' ],
        [ 'crewOpenOrders' ],
        [ 'orderList', returnValues.product, returnValues.exchange.id ],
        [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
        [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
        [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      ];
    },

    getLogContent: ({ event: { returnValues } }, viewingAs, { exchange = {} }) => {
      // TODO: add marketplace owner? how do they keep track of fees?
      // TODO: is this accounting for fees?
      const payload = (
        <>
          {formatResourceAmount(returnValues.amount, returnValues.product)}{' '}
          {Product.TYPES[returnValues.product]?.name} for{' '}
          {formatPrice(returnValues.amount * returnValues.price / 1e6)} SWAY{' '}
          at <EntityLink {...returnValues.exchange} />
        </>
      );
      if (viewingAs.label === Entity.IDS.CREW && viewingAs.id === returnValues.buyerCrew.id) {
        return {
          icon: <LimitBuyIcon />,
          content: <>Purchased {payload}</>,
        }
      }
      return {
        icon: <MarketSellIcon />,
        content: <>Sold {payload}</>,
      }
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      exchange: returnValues.exchange,
    }),

    triggerAlert: true
  },

  ConstructionPlanned: {
    getInvalidations: ({ event: { returnValues } }, { building = {} }) => {
      const lotId = locationsArrToObj(building?.Location?.locations || [])?.lotId;
      return [
        ...invalidationDefaults(Entity.IDS.BUILDING, returnValues.building.id),
        ['entities', Entity.IDS.BUILDING, 'lot', lotId],
        ['planned'],
        ['asteroidCrewBuildings', returnValues.asteroid.id, returnValues.callerCrew.id],
      ];
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.building,
    }),
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
    getActionItem: ({ returnValues }, viewingAs, { building = {} }) => {
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
        // this tx theoretically should have been blocked by UI, but just in case... this will avoid empty logs
        if (to1.length === 0 && to2.length === 0) return null;

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

  CrewEjected: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
      ...invalidationDefaults(returnValues.ejectedCrew.label, returnValues.ejectedCrew.id),
      ...invalidationDefaults(returnValues.station.label, returnValues.station.id),
    ]),

    getLogContent: ({ event: { returnValues } }, { viewingAs }) => {
      const selfEjection = returnValues.ejectedCrew.id === returnValues.callerCrew.id;
      return {
        icon: selfEjection ? <EjectMyCrewIcon /> : <EjectPassengersIcon />,
        content: (
          <>
          <EntityLink {...returnValues.ejectedCrew} />
          {selfEjection ? ' self-ejected' : ' force-ejected'}
          {' '}from <EntityLink {...returnValues.station} />
          {selfEjection ? '' : <>{' '}by <EntityLink {...returnValues.callerCrew} /></>}
        </>
        ),
      };
    },

    requiresCrewTime: true
  },

  CrewStationed: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
      ...invalidationDefaults(returnValues.station.label, returnValues.station.id),
      // TODO: previous station
    ]),

    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <StationCrewIcon />,
        content: (
          <>
          <EntityLink {...returnValues.callerCrew} />
          {' '}stationed in <EntityLink {...returnValues.station} />
        </>
        ),
      };
    },

    requiresCrewTime: true
  },

  // deprecated vvv
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
    getPrepopEntities: ({ event: { returnValues } }) => ({
      destination: returnValues.dest,
    }),
  },
  DeliveryFinished: {
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
  },
  // deprecated ^^^

  DeliveryAccepted: {
    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DELIVERY, returnValues.delivery.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
      ['actionItems']
    ]),
  },
  DeliveryCancelled: {
    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DELIVERY, returnValues.delivery.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ['actionItems']
    ]),
  },
  DeliveryPackaged: {
    getActionItem: ({ returnValues }, viewingAs, { destination = {} }) => {
      const _location = locationsArrToObj(destination?.Location?.locations || []);
      return {
        icon: <SurfaceTransferIcon />,
        label: `${destination?.Control?.controller?.id !== viewingAs?.id ? 'Outgoing' : 'Incoming'} Transfer Proposal`,
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
        (tx.key === 'AcceptDelivery' || tx.key === 'CancelDelivery')
        && tx.vars.delivery.id === returnValues.delivery.id
      ))
    },

    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(Entity.IDS.DELIVERY, returnValues.delivery.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ['actionItems']
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      destination: returnValues.dest,
      origin: returnValues.origin,
    }),

    // getLogContent: ({ event: { returnValues } }, viewingAs, { destination = {} }) => {
    //   const _location = locationsArrToObj(destination?.Location?.locations || []);
    //   return {
    //     icon: <SurfaceTransferIcon />,
    //     content: (
    //       <>
    //         <span>Delivery proposed to </span>
    //         <EntityLink {...returnValues.dest} />
    //         {_location.lotId && <>at<LotLink lotId={_location.lotId} /></>}
    //       </>
    //     ),
    //   };
    // },

    // requiresCrewTime: true
  },

  DeliveryReceived: {
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
    getLogContent: ({ event: { returnValues } }, viewingAs, { delivery }) => {
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

  DeliverySent: {
    getActionItem: ({ returnValues }, viewingAs, { destination = {} }) => {
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
        tx.key === 'ReceiveDelivery'
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

    // getLogContent: ({ event: { returnValues } }, viewingAs, { destination = {} }) => {
    //   const _location = locationsArrToObj(destination?.Location?.locations || []);
    //   return {
    //     icon: <SurfaceTransferIcon />,
    //     content: (
    //       <>
    //         <span>Delivery started to </span>
    //         <EntityLink {...returnValues.dest} />
    //         {_location.lotId && <>at<LotLink lotId={_location.lotId} /></>}
    //       </>
    //     ),
    //   };
    // },

    requiresCrewTime: true
  },

  EmergencyActivated: {
    getInvalidations: ({ event: { returnValues } }) => {
      return [
        ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ];
    },
    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <EmergencyModeEnterIcon />,
        content: (
          <>
            <span>
              <EntityName {...returnValues.ship} /> activated Emergency Mode
            </span>
          </>
        ),
      };
    },
    triggerAlert: true
  },
  EmergencyDeactivated: {
    getInvalidations: ({ event: { returnValues } }) => {
      return [
        ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ];
    },
    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <EmergencyModeExitIcon />,
        content: (
          <>
            <span>
              <EntityName {...returnValues.ship} /> deactivated Emergency Mode
            </span>
          </>
        ),
      };
    },
    triggerAlert: true
  },
  EmergencyPropellantCollected: {
    getInvalidations: ({ event: { returnValues } }) => {
      return [
        ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ];
    },
    // TODO: log content seems like overkill here?
    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <EmergencyModeCollectIcon />,
        content: (
          <>
            <span>
              <EntityName {...returnValues.ship} /> collected {formatResourceMass(returnValues.amount, Product.IDS.HYDROGEN_PROPELLANT)} of Emergency Propellant
            </span>
          </>
        ),
      };
    },
  },

  ExchangeConfigured: {
    getInvalidations: ({ event: { returnValues } }) => ([
      ...invalidationDefaults(returnValues.exchange.label, returnValues.exchange.id),
    ]),
  },

  FoodSupplied: {
    getInvalidations: ({ event: { returnValues } }) => {
      // TODO: replace lastFed in place
      return [
        ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id),
        ...(returnValues.origin ? invalidationDefaults(returnValues.origin.label, returnValues.origin.id) : []),
      ];
    },
    getLogContent: ({ event: { returnValues } }, viewingAs) => {
      return {
        icon: <FoodIcon />,
        content: (
          <>
            <span>
              <EntityName {...returnValues.callerCrew} /> resupplied with{' '}
              {formatResourceMass(returnValues.food, Product.IDS.FOOD)} food
            </span>
          </>
        ),
      };
    },
    requiresCrewTime: true,
    triggerAlert: true
  },

  ArrivalRewardClaimed: {
    getInvalidations: ({ event: { returnValues } }) => {
      return [
        ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id),
        ...invalidationDefaults(Entity.IDS.CREW, returnValues.callerCrew.id)
      ];
    },
    getLogContent: ({ event: { returnValues } }, viewingAs) => {
      return {
        icon: <ClaimRewardIcon />,
        content: (
          <>
            <span>
              <EntityLink {...returnValues.callerCrew} /> claimed the starter pack for
              {' '}<EntityLink {...returnValues.asteroid} />
            </span>
          </>
        ),
      };
    },
    triggerAlert: true
  },

  PrepareForLaunchRewardClaimed: {
    getInvalidations: ({ event: { returnValues } }) => {
      return [
        ...invalidationDefaults(Entity.IDS.ASTEROID, returnValues.asteroid.id)
      ];
    },
    getLogContent: ({ event: { returnValues } }, viewingAs) => {
      return {
        icon: <ClaimRewardIcon />,
        content: (
          <>
            <span>
              Crewmate credit claimed for
              {' '}<EntityLink {...returnValues.asteroid} />
            </span>
          </>
        ),
      };
    },
    triggerAlert: true
  },

  MaterialProcessingStarted: {
    getActionItem: ({ returnValues }, viewingAs, { building = {} }) => {
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
        tx.key === 'ProcessProductsFinish'
        && tx.vars.processor.id === returnValues.processor.id
        && tx.vars.processor_slot === returnValues.processorSlot
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

  RandomEventResolved: {
    getInvalidations: ({ event: { returnValues } }) => ([
      // ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id), // this is redundant to `requiresCrewTime`
      [ 'swayBalance' ],
    ]),

    getLogContent: ({ event: { returnValues } }, viewingAs) => {
      return {
        icon: <RandomEventIcon isPaused />,
        content: (
          <>
            <span><EntityLink {...returnValues.callerCrew} /> completed "{RandomEvent.TYPES[returnValues.randomEvent]?.name || 'Random Event'}"</span>
          </>
        ),
      };
    },

    requiresCrewTime: true, // to reset random event crew data
    triggerAlert: true
  },

  ResourceExtractionStarted: {
    getActionItem: ({ returnValues }, viewingAs, { extractor = {} }) => {
      const _location = locationsArrToObj(extractor?.Location?.locations || []);
      return {
        icon: <ExtractionIcon />,
        label: `${Product.TYPES[returnValues?.resource]?.name || 'Resource'} Extraction`,
        asteroidId: _location.asteroidId,
        lotId: _location.lotId,
        // resourceId: returnValues.resource,
        locationDetail: getEntityName(extractor),
        onClick: ({ openDialog }) => {
          openDialog('EXTRACT_RESOURCE');
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'ExtractResourceFinish'
        && tx.vars.extractor.id === returnValues.extractor.id
        && tx.vars.extractor_slot === returnValues.extractorSlot
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
      ['entities', Entity.IDS.DEPOSIT, 'lot', returnValues.lot.id], // b/c can be new in search
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

  SellOrderCancelled: {
    getInvalidations: ({ event: { returnValues } }, { exchange = {} }) => {
      const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
      // console.log('invalidate on SellOrderCancelled', [
      //   ...invalidationDefaults(returnValues.exchange),
      //   ...invalidationDefaults(returnValues.storage),
      //   [ 'crewOpenOrders' ],
      //   [ 'orderList', returnValues.product, returnValues.exchange.id ],
      //   [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
      //   [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
      //   [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      // ]);
      return [
        ...invalidationDefaults(returnValues.exchange),
        ...invalidationDefaults(returnValues.storage),
        [ 'crewOpenOrders' ],
        [ 'orderList', returnValues.product, returnValues.exchange.id ],
        [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
        [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
        [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      ];
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      exchange: returnValues.exchange,
    })
  },
  SellOrderCreated: {
    getInvalidations: ({ event: { returnValues } }, { exchange = {} }) => {
      const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
      return [
        ...invalidationDefaults(returnValues.exchange),
        ...invalidationDefaults(returnValues.storage),
        [ 'crewOpenOrders' ],
        [ 'orderList', returnValues.product, returnValues.exchange.id ],
        [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
        [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
        [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
      ];
    },
    // getLogContent: ({ event: { returnValues } }) => ({}),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      exchange: returnValues.exchange,
    }),

    requiresCrewTime: true
  },

  // this applies ONLY to nfts being sold for sway
  SellOrderSet: {
    getInvalidations: ({ entities, event: { returnValues } }) => {
      // TODO: entities should be coming back from ws now, so should be able to remove the else...
      const entity = entities?.[0];
      if (entity) {
        return [...invalidationDefaults(entity.label, entity.id)];
      } else {
        return [...invalidationDefaults(Entity.IDS.SHIP, returnValues.tokenId)];
      }
    },
  },
  // this applies BOTH to nfts being sold for sway AND marketplace sell orders
  SellOrderFilled: {
    getInvalidations: ({ entities, event: { returnValues } }, { exchange = {} }) => {
      // nft
      if (returnValues.tokenId) {
        // TODO: use entities here? currently just relying on Transfer event to invalidate entity
        return [[ 'swayBalance' ]];

      // marketplace
      } else {
        const { asteroidId, lotId } = locationsArrToObj(exchange?.Location?.locations || []) || {};
        return [
          ...invalidationDefaults(returnValues.exchange),
          ...invalidationDefaults(returnValues.destination),
          ...invalidationDefaults(returnValues.storage),
          [ 'swayBalance' ],
          [ 'crewOpenOrders' ],
          [ 'orderList', returnValues.product, returnValues.exchange.id ],
          [ 'exchangeOrderSummary', asteroidId, returnValues.product ],
          [ 'productOrderSummary', Entity.IDS.ASTEROID, asteroidId ],
          [ 'productOrderSummary', Entity.IDS.LOT, lotId ],
        ];
      }
    },

    getLogContent: ({ entities, event: { returnValues } }, viewingAs, { exchange = {} }) => {
      // nft
      if (returnValues.tokenId) {
        // TODO: use entities here? currently just relying on Transfer event for log
        return null;

      // marketplace
      } else {

        // TODO: add marketplace owner? how do they keep track of fees?
        // TODO: is this accounting for fees?
        const payload = (
          <>
            {formatResourceAmount(returnValues.amount, returnValues.product)}{' '}
            {Product.TYPES[returnValues.product]?.name} for{' '}
            {formatPrice(returnValues.amount * returnValues.price / 1e6)} SWAY{' '}
            at <EntityLink {...returnValues.exchange} />
          </>
        );
        if (viewingAs.label === Entity.IDS.CREW && viewingAs.id === returnValues.sellerCrew.id) {
          return {
            icon: <LimitSellIcon />,
            content: <>Sold {payload}</>,
          }
        }
        return {
          icon: <MarketBuyIcon />,
          content: <>Purchased {payload}</>,
        }
      }
    },

    getPrepopEntities: ({ event: { returnValues } }) => {
      // nft
      if (returnValues.tokenId) {
        return {};

      // marketplace
      } else {
        return { exchange: returnValues.exchange };
      }
    },

    triggerAlert: true
  },

  ShipAssemblyStarted: {
    getActionItem: ({ returnValues }, viewingAs, { building = {} }) => {
      const _location = locationsArrToObj(building?.Location?.locations || []);
      return {
        icon: <ShipIcon />,
        label: `${Ship.TYPES[returnValues.shipType]?.name || 'Ship'} Assembly`,
        asteroidId: _location.asteroidId,
        lotId: _location.lotId,
        locationDetail: getEntityName(building),
        onClick: ({ openDialog }) => {
          openDialog('ASSEMBLE_SHIP', { dryDockSlot: returnValues.dryDockSlot });
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => (
        tx.key === 'AssembleShipFinish'
        && tx.vars.dry_dock.id === returnValues.dryDock.id
        && tx.vars.dry_dock_slot === returnValues.dryDockSlot
      ))
    },

    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(returnValues.dryDock.label, returnValues.dryDock.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ['actionItems']
      // TODO: do we need this for building status?
      // ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.dryDock,
    }),

    // getLogContent: ({ event: { returnValues } }, viewingAs, { building = {} }) => {
    //   const _location = locationsArrToObj(building?.Location?.locations || []);
    //   return {
    //     icon: <ShipIcon />,
    //     content: (
    //       <>
    //         <span>{Ship.TYPES[returnValues.shipType]?.name || 'Ship'} assembly started at </span>
    //         <LotLink lotId={_location.lotId} />
    //       </>
    //     ),
    //   };
    // },

    requiresCrewTime: true
  },
  ShipAssemblyFinished: {
    getInvalidations: ({ event: { returnValues } }, { building = {}, destination = {} }) => {
      const lotId = destination?.label === Entity.IDS.LOT ? destination.id : locationsArrToObj(destination?.Location?.locations || [])?.lotId;
      const invs = [
        ...invalidationDefaults(returnValues.dryDock.label, returnValues.dryDock.id),
        ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
        ['entities', Entity.IDS.SHIP, 'lot', lotId], // (b/c will be new in search)
        ['actionItems'],
        // TODO: ...
        // ['asteroidInventories', asteroidId],
        // ['asteroidCrewShips', returnValues.asteroidId, returnValues.crewId],
      ];

      const dryDock = (building?.DryDocks || []).find((p) => p.slot === returnValues.dryDockSlot);
      if (dryDock?.outputShip) invs.unshift(...invalidationDefaults(dryDock.outputShip.label, dryDock.outputShip.id));

      // TODO: do we need this for building status?
      // ['asteroidCrewBuildings', returnValues.asteroidId, returnValues.crewId],

      return invs;
    },

    getPrepopEntities: ({ event: { returnValues } }) => ({
      building: returnValues.dryDock,
      destination: returnValues.destination,
    }),

    getLogContent: ({ event: { returnValues } }, viewingAs, { building = {}, destination = {} }) => {
      const _location = locationsArrToObj(building?.Location?.locations || []);
      const _dlocation = locationsArrToObj(destination?.Location?.locations || []);
      return {
        icon: <ShipIcon />,
        content: (
          <>
            <span><EntityLink {...returnValues.ship} /> assembled at </span>
            <span><LotLink lotId={_location.lotId} /> and delivered to <LotLink lotId={_dlocation?.lotId || returnValues.destination?.id} /></span>
          </>
        ),
      };
    },

    triggerAlert: true
  },

  ShipDocked: {
    getInvalidations: ({ event: { returnValues } }, { dock = {} }) => {
      const lotId = dock?.label === Entity.IDS.LOT ? dock.id : locationsArrToObj(dock?.Location?.locations || [])?.lotId;
      return [
        ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
        ...invalidationDefaults(returnValues.dock.label, returnValues.dock.id),
        ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
        ['entities', Entity.IDS.SHIP, 'lot', lotId], // (b/c will be new in search)
        // TODO: any others? passenger crews?
      ];
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      dock: returnValues.dock
    }),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <ScanAsteroidIcon />,
      content: (
        <>
          <EntityLink {...returnValues.ship} /> docked at <EntityLink {...returnValues.dock} />
        </>
      )
    }),
    requiresCrewTime: true, // only true currently if !powered
    triggerAlert: true
  },

  ShipUndocked: {
    getInvalidations: ({ event: { returnValues } }, { dock = {} }) => ([
      ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ...invalidationDefaults(returnValues.dock.label, returnValues.dock.id),
      ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
      [ 'entities', Entity.IDS.SHIP, 'asteroid', (dock?.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID)?.id ],
      // TODO: any others? passenger crews?
    ]),
    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <LaunchShipIcon />,
        content: (
          <>
            <EntityLink {...returnValues.ship} /> {returnValues.dock.label === Entity.IDS.BUILDING ? 'undocked' : 'launched'} from <EntityLink {...returnValues.dock} />
          </>
        )
      };
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      dock: returnValues.dock,
    }),
    requiresCrewTime: true, // only true currently if !powered
    triggerAlert: true
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

  TransitStarted: {
    getActionItem: ({ returnValues }, viewingAs, { origin = {} }) => {
      return {
        icon: <SetCourseIcon />,
        label: `In Flight`,
        asteroidId: returnValues.destination.id,
        // lotId: _location.lotId,
        locationDetail: getEntityName(origin),
        onClick: ({ openDialog }) => {
          openDialog('SET_COURSE');
        }
      };
    },
    getIsActionItemHidden: ({ returnValues }) => (pendingTransactions) => {
      return pendingTransactions.find((tx) => tx.key === 'TransitBetweenFinish')
    },

    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ...invalidationDefaults(returnValues.origin.label, returnValues.origin.id),
      ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
      ['actionItems'],
    ]),

    getPrepopEntities: ({ event: { returnValues } }) => ({
      origin: returnValues.origin,
    }),

    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <SetCourseIcon />,
        content: (
          <>
            <EntityLink {...returnValues.callerCrew} />
            <span> set course from </span>
            <EntityLink {...returnValues.origin} />{' to '}<EntityLink {...returnValues.destination} />
          </>
        ),
      };
    },

    requiresCrewTime: true,
    triggerAlert: true
  },

  TransitFinished: {
    getInvalidations: ({ event: { returnValues, version } }) => ([
      ...invalidationDefaults(returnValues.ship.label, returnValues.ship.id),
      ...invalidationDefaults(returnValues.destination.label, returnValues.destination.id),
      ...invalidationDefaults(returnValues.callerCrew.label, returnValues.callerCrew.id),
      ['actionItems'],
    ]),

    getLogContent: ({ event: { returnValues } }) => {
      return {
        icon: <SetCourseIcon />,
        content: (
          <>
            <EntityLink {...returnValues.callerCrew} />
            <span> entered orbit around </span>
            <EntityLink {...returnValues.destination} />
          </>
        ),
      };
    },

    triggerAlert: true
  },

  ShipCommandeered: {
    getInvalidations: ({ event: { returnValues } }, { ship = {} }) => {
      const location = locationsArrToObj(ship?.Location?.locations || []);
      return [
        ...invalidationDefaults(Entity.IDS.SHIP, returnValues.ship.id),
        [ 'asteroidInventories', location?.asteroidId ],
      ];
    },
    getPrepopEntities: ({ event: { returnValues } }) => ({
      ship: returnValues.ship,
    }),
    getLogContent: ({ event: { returnValues } }, viewingAs, { ship = {} }) => ({
      icon: <BecomeAdminIcon />,
      content: (
        <>
          <EntityLink {...returnValues.callerCrew} />
          {' '}commandeered {Ship.TYPES[ship?.Ship?.shipType]?.name} <EntityLink {...returnValues.ship} />
        </>
      ),
    }),
  },

  AddedToWhitelist: { getInvalidations: getPolicyInvalidations },
  RemovedFromWhitelist: { getInvalidations: getPolicyInvalidations },
  ContractPolicyAssigned: { getInvalidations: getPolicyInvalidations },
  ContractPolicyRemoved: { getInvalidations: getPolicyInvalidations },
  PrepaidPolicyAssigned: { getInvalidations: getPolicyInvalidations },
  PrepaidPolicyRemoved: { getInvalidations: getPolicyInvalidations },
  PublicPolicyAssigned: { getInvalidations: getPolicyInvalidations },
  PublicPolicyRemoved: { getInvalidations: getPolicyInvalidations },
  PrepaidMerklePolicyAssigned: { getInvalidations: getPolicyInvalidations },
  PrepaidMerklePolicyRemoved: { getInvalidations: getPolicyInvalidations },

  ContractAgreementAccepted: { getInvalidations: getAgreementInvalidations },
  PrepaidMerkleAgreementAccepted: { getInvalidations: getAgreementInvalidations },
  PrepaidAgreementAccepted: { getInvalidations: getAgreementInvalidations },
  PrepaidAgreementExtended: { getInvalidations: getAgreementInvalidations },
  PrepaidAgreementCancelled: { getInvalidations: getAgreementInvalidations },
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
                    // console.log({ label, id, data });
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
      return null;
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
