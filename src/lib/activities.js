import { Address, Entity } from '@influenceth/sdk';
import { AiFillEdit as NameIcon } from 'react-icons/ai';
import { BiTransfer as TransferIcon } from 'react-icons/bi';

import AddressLink from '~/components/AddressLink';
import EntityLink from '~/components/EntityLink';
import {
  CrewIcon,
  CrewmateIcon,
  KeysIcon,
  PromoteIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  StationCrewIcon
} from '~/components/Icons';
import LotLink from '~/components/LotLink';

import { andList, ucfirst } from './utils';

// TODO (enhancement): some of the invalidations may be overkill by using this
const invalidationDefaults = (label, id) => {
  const i = [];
  // any group results where the affected record might be included
  // TODO: https://tanstack.com/query/v4/docs/react/guides/query-invalidation
  //  can pass in predicates so can check each result to see if contains the relevant record (or would now) before invalidating
  i.push(['entities', label]);

  // the specific affected record (and its activities)
  if (id) {
    i.push(['entity', label, id]);
    i.push(['activities', label, id]);
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

const addressMaxWidth = '100px';

const getNamedAddress = (address) => {
  if (Address.areEqual(address, process.env.REACT_APP_STARKNET_ASTEROID_TOKEN)) return 'the Asteroid Bridge';
  else if (Address.areEqual(address, process.env.REACT_APP_STARKNET_CREWMATE_TOKEN)) return 'the Crewmate Bridge';
}

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
          Crew <EntityLink {...returnValues.callerCrew} />
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

  // TODO: do any of these need invalidations or logs?
  //  ^ or some specialized version of an actionitem
  BridgeFromStarknet: {},
  BridgeToStarknet: {},
  BridgedFromL1: {},
  BridgedToL1: {},

  // ConstructionDeconstructed,
    // = invalidations
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    // = content log
    // return {
    //   icon: <DeconstructIcon />,
    //   content: (
    //     <>
    //       <span>{capableName ? `${capableName} ` : 'Building'} deconstructed on </span>
    //       <LotLink asteroidId={asteroidId} lotId={lotId} />
    //     </>
    //   ),
    // };
  // ConstructionFinished,
    // = invalidations
    //   ['actionItems'],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    // = content log
    // return {
    //   icon: <ConstructIcon />,
    //   content: (
    //     <>
    //       <span>{capableName ? `${capableName} construction` : 'Construction'} finished on </span>
    //       <LotLink asteroidId={asteroidId} lotId={lotId} />
    //     </>
    //   ),
    // };
  // ConstructionPlanned,
    // = invalidations
    //   ['planned'],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    // = content log
    // ({
    //   icon: <PlanBuildingIcon />,
    //   content: (
    //     <>
    //       <span>{Building.TYPES[e.returnValues.buildingType]?.title} site plan completed on </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // })
  // ConstructionStarted,
    //  = invalidations
    //   ['planned'],
    //   ['actionItems'],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    //  = action item:
    //     formatted.icon = <ConstructIcon />;
    //     formatted.label = `${Building.TYPES[item.assets.building.type]?.name || 'Building'} Construction`;
    //     formatted.asteroidId = item.assets.asteroid.i;
    //     formatted.lotId = item.assets.lot.i;
    //     formatted.onClick = ({ openDialog }) => {
    //       openDialog('CONSTRUCT');
    //     };
    //  = actionitem hidden:
    //     return !pendingTransactions.find((tx) => (
    //       tx.key === 'FINISH_CONSTRUCTION'
    //       && tx.vars.asteroidId === item.assets.asteroid.i
    //       && tx.vars.lotId === item.assets.lot.i
    //     ));
  // ConstructionUnplanned,
    // = invalidations
    //   ['planned'],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   // ['asteroidLots', returnValues.asteroidId], (handled by asteroid room connection now)
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    // = content log
    // ({
    //   icon: <UnplanBuildingIcon />,
    //   content: (
    //     <>
    //       <span>Construction plans canceled on </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // })

  CrewDelegated: {
    getInvalidations: ({ event: { returnValues } }) => invalidationDefaults(Entity.IDS.CREW, returnValues.crew.id),
    getLogContent: ({ event: { returnValues } }) => ({
      icon: <CrewIcon />,
      content: (
        <>
          Crew <EntityLink {...returnValues.crew} />
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
          Crew <EntityLink {...returnValues.callerCrew} />
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
    getLogContent: ({ event: { returnValues, version = 0 /* TODO: remove this default once Charlie's fix is in */ } }, viewingAs = {}) => {
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
                  {' '}on <EntityLink {...toCrew} /> exchanged for{' '}
                  {' '}{andList(fromList.map((id) => <EntityLink key={id} label={Entity.IDS.CREWMATE} id={id} />))}
                  {' '}on <EntityLink {...fromCrew} />
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
                  {' '}transferred to <EntityLink {...fromCrew} />
                  {' '}from <EntityLink {...toCrew} />
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
  },

  // DeliveryFinished,
    // = invalidations
    //   ['actionItems'],
    //   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
    // = content log
    // return {
    //   icon: <SurfaceTransferIcon />,
    //   content: (
    //     <>
    //       <span>Delivery completed to </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.destinationLotId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // };
  // DeliveryStarted,
  // = invalidations
  //   ['actionItems'],
  //   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i]
  // = action item
  //     formatted.icon = <SurfaceTransferIcon />;
  //     formatted.label = 'Surface Transfer';
  //     formatted.asteroidId = item.event.returnValues?.asteroidId;
  //     formatted.lotId = item.event.returnValues?.destinationLotId;  // after start, link to destination
  //     formatted.onClick = ({ openDialog }) => {
  //       openDialog('SURFACE_TRANSFER', { deliveryId: item.assets.delivery?.deliveryId });
  //     };
  // = action item hidden
  //     return !pendingTransactions.find((tx) => (
  //       tx.key === 'FINISH_DELIVERY'
  //       && tx.vars.asteroidId === item.event.returnValues?.asteroidId
  //       && tx.vars.destLotId === item.event.returnValues?.destinationLotId
  //       && tx.vars.deliveryId === item.assets.delivery?.deliveryId
  //     ));

  // DockShip,
  // EarlyAdopterRewardClaimed,
  // FoodSupplied,
  // MaterialProcessingFinished,
  // MaterialProcessingStarted,

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
  },

  // OrderCreated,
  // PrepaidPolicyAssigned,
  // PrepaidPolicyRemoved,
  // PublicPolicyAssigned,
  // RemovedFromWhitelist,
  // ResourceExtractionFinished,
    // = invalidations
    //   ['actionItems'],
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    //   ['lots', returnValues.asteroidId, returnValues.lotId]
    // = content log
    // return {
    //   icon: <ExtractionIcon />,
    //   content: (
    //     <>
    //       <span>Extraction completed at </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // };
  // ResourceExtractionStarted,
    // = invalidations
    //   ['actionItems'],
    //   ['asteroidCrewLots', returnValues.asteroidId, returnValues.crewId],
    //   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //   // ['lots', returnValues.asteroidId, returnValues.destinationLotId] // (this should happen in inventory_changed)
    // = action item
    //     formatted.icon = <ExtractionIcon />;
    //     formatted.label = `${Product.TYPES[item.event.returnValues?.resourceId]?.name || 'Resource'} Extraction`;
    //     formatted.asteroidId = item.event.returnValues?.asteroidId;
    //     formatted.lotId = item.event.returnValues?.lotId;
    //     formatted.resourceId = item.event.returnValues?.resourceId;
    //     formatted.onClick = ({ openDialog }) => {
    //       openDialog('EXTRACT_RESOURCE');
    //     };
    // = action item hidden
    //    return !pendingTransactions.find((tx) => (
    //       tx.key === 'FINISH_EXTRACTION'
    //       && tx.vars.asteroidId === item.event.returnValues?.asteroidId
    //       && tx.vars.lotId === item.event.returnValues?.lotId
    //     ));
    // = content log
    // return {
    //   icon: <ExtractionIcon />,
    //   content: (
    //     <>
    //       <span>{Product.TYPES[e.returnValues.resourceId]?.name} extraction started at </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} resourceId={e.returnValues.resourceId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // };
  // ResourceScanFinished,
  // ResourceScanStarted,
  // SaleOffered,
  // SamplingDepositFinished,
    // = invalidations
    //   ['actionItems'],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    // = content log
    // return {
    //   icon: <NewCoreSampleIcon />,
    //   content: (
    //     <>
    //       <span>{Product.TYPES[e.returnValues.resourceId]?.name} core sample completed at </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} resourceId={e.returnValues.resourceId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // };
  // SamplingDepositStarted,
    //  = invalidations
    //   ['actionItems'],
    //   ['asteroidCrewSampledLots', returnValues.asteroidId, returnValues.resourceId, returnValues.crewId],
    //   ['lots', returnValues.asteroidId, returnValues.lotId],
    //  = action item
    //     const isImprovement = item.assets?.coreSample?.initialYield > 0;
    //     formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />;
    //     formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
    //     formatted.asteroidId = item.event.returnValues?.asteroidId;
    //     formatted.lotId = item.event.returnValues?.lotId;
    //     formatted.resourceId = item.event.returnValues?.resourceId;
    //     formatted.locationDetail = Product.TYPES[item.event.returnValues?.resourceId].name;
    //     formatted.onClick = ({ openDialog }) => {
    //       openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
    //     };
    // = action item hidden
    //    return !pendingTransactions.find((tx) => (
    //    tx.key === 'FINISH_CORE_SAMPLE'
    //    && tx.vars.asteroidId === item.event.returnValues?.asteroidId
    //    && tx.vars.lotId === item.event.returnValues?.lotId
    // = (optional) log content
    // ({
    //   icon: <NewCoreSampleIcon />,
    //   content: (
    //     <>
    //       <span>{Product.TYPES[e.returnValues.resourceId]?.name} core sample started at </span>
    //       <LotLink asteroidId={e.returnValues.asteroidId} lotId={e.returnValues.lotId} resourceId={e.returnValues.resourceId} />
    //     </>
    //   ),
    //   txLink: getTxLink(e),
    // }),

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
      label: 'Asteroid Surface Scan',
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
              {ucfirst(Entity.TYPES[entity?.label]?.label || '')}
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

const getActivityConfig = (activity, viewingAs = {}) => {
  const name = activity?.event?.name || activity?.event?.event;
  if (!activities[name]) {
    console.warn(`No activity config for ${name}`);
    return null;
  }

  const config = activities[name];
  if (!config) console.warn(`No activity config found for "${name}"!`);

  const actionItem = config?.getActionItem ? config.getActionItem(activity.event) : null;

  const invalidations = config?.getInvalidations ? config.getInvalidations(activity) : [];

  const logContent = config?.getLogContent ? config.getLogContent(activity, viewingAs) : null;
  if (logContent && activity.event.transactionHash) logContent.txLink = `${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${activity.event.transactionHash}`;
  // TODO: support L1? __t is in event record, but is not included in activity record...
  //  `${process.env.REACT_APP_ETHEREUM_EXPLORER_URL}/tx/${activity.event?.transactionHash}`

  const triggerAlert = !!config?.triggerAlert;

  const isActionItemHidden = (pendingTransactions) => {
    return config?.getIsActionItemHidden && config.getIsActionItemHidden(activity.event)(pendingTransactions);
  };

  return {
    actionItem,
    invalidations,
    logContent,
    isActionItemHidden,
    triggerAlert
  };
}

export const typesWithLogContent = Object.keys(activities).filter((type) => !!activities[type].getLogContent);

export default getActivityConfig;

// TODO: write a test to make sure all activities (from sdk) have a config

// TODO: remove references to old methods below when no longer need the reference

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

// TODO: old events that do not have a corresponding entry yet:
// Inventory_ReservedChanged: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
//   ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
// ],
// Inventory_Changed: [
//   ['lots', getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Lot').i],
//   ['asteroidCrewLots',  getLinkedAsset(linked, 'Asteroid').i, getLinkedAsset(linked, 'Crew').i],
// ],
