import { Building, Entity, Lot, Product } from '@influenceth/sdk';
import moment from 'moment';

import {
  CrewIcon,
  CrewmateIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  SurfaceTransferIcon,
  ShipIcon,
  BuildingIcon,
  KeysIcon,
  ManageCrewIcon,
  NewCoreSampleIcon,
  UnplanBuildingIcon,
  ConstructIcon,
} from '~/components/Icons';
import theme, { hexToRGB } from '~/theme';

const formatAsItem = (activity, actionItem = {}) => {
  const formatted = {
    key: `activity_${activity._id}`,
    type: activity.type,
    icon: null,
    label: '',
    asteroidId: null,
    lotId: null,
    resourceId: null,
    locationDetail: '',
    finishTime: activity.event.returnValues.finishTime || 0,
    startTime: activity.event.timestamp || 0,
    ago: (new moment(new Date(1000 * (activity.event.returnValues.finishTime || 0)))).fromNow(),
    onClick: null,

    // overwrite with formatted actionItem keys
    ...actionItem
  };

  if (formatted?.asteroidId) formatted.asteroidId = Number(formatted.asteroidId);
  if (formatted?.lotId) formatted.lotId = Number(formatted.lotId);
  if (formatted?.resourceId) formatted.resourceId = Number(formatted.resourceId);

  return formatted;
};

const formatAsPlans = (item) => {
  return {
    key: item.key,
    type: item.type,
    icon: <PlanBuildingIcon />,
    label: `${Building.TYPES[item.Building?.buildingType].name || ''} Site Plan`,
    crewId: item.Control?.controller?.id,
    asteroidId: Number((item.Location?.locations || []).find((l) => l.label === Entity.IDS.ASTEROID)?.id),
    lotId: Number((item.Location?.locations || []).find((l) => l.label === Entity.IDS.LOT)?.id),
    resourceId: null,
    locationDetail: '',
    finishTime: item.waitingFor,
    startTime: null,
    onClick: ({ openDialog }) => {
      openDialog('CONSTRUCT');
    }
  };
};

const formatAsTx = (item) => {
  const formatted = {
    key: item.key,
    type: item.type,
    txHash: item.txHash,
    icon: null,
    label: '',
    crewId: null,
    asteroidId: null,
    lotId: null,
    resourceId: null,
    locationDetail: '',
    finishTime: null,
    startTime: null,
    onClick: null,
    _timestamp: item.timestamp // (only used for dismissing failed tx's)
  };

  // TODO: should these all go in lib/activities?
  //  if so, copy in all the deprecated / not-yet-implemented items as well for reference
  const eventName = item.event?.event || item.key;
  switch(eventName) {
    case 'ArrangeCrew': {
      formatted.icon = <ManageCrewIcon />;
      formatted.label = 'Manage Crew';
      formatted.onClick = ({ openDialog }) => {
        openDialog('MANAGE_CREW'); // TODO: need crew id?
      };
      break;
    }
    case 'ExchangeCrew': {
      formatted.icon = <ManageCrewIcon />;
      formatted.label = 'Exchange Crew';
      formatted.onClick = ({ openDialog }) => {
        openDialog('MANAGE_CREW'); // TODO: need exchange crew id // TODO: need crew id?
      };
      break;
    }

    case 'ChangeName': {
      if (item.vars.entity.label === Entity.IDS.ASTEROID) {
        formatted.icon = <PurchaseAsteroidIcon />;
        formatted.label = 'Rename Asteroid';
        formatted.asteroidId = item.vars.entity.id;
        formatted.locationDetail = item.vars.name;
        formatted.onClick = ({ history }) => {
          history.push(`/asteroids/${formatted.asteroidId}`);
        };
      }
      if (item.vars.entity.label === Entity.IDS.CREW) {
        formatted.icon = <CrewIcon />;
        formatted.label = 'Rename Crew';
        formatted.locationDetail = item.vars.name;
        formatted.onClick = ({ history }) => {
          history.push(`/crew/${item.vars.entity.id}`);
        };
      }
      if (item.vars.entity.label === Entity.IDS.CREWMATE) {
        formatted.icon = <CrewmateIcon />;
        formatted.label = 'Rename Cremwate';
        formatted.locationDetail = item.vars.name;
        formatted.onClick = ({ history }) => {
          history.push(`/crewmate/${item.vars.entity.id}`);
        };
      }
      if (item.vars.entity.label === Entity.IDS.BUILDING) {
        formatted.icon = <BuildingIcon />;
        formatted.label = 'Rename Building';
        formatted.locationDetail = item.vars.name;
        formatted.onClick = ({ history }) => {
          // TODO: link to lot
        };
      }
      if (item.vars.entity.label === Entity.IDS.SHIP) {
        formatted.icon = <ShipIcon />;
        formatted.label = 'Rename Ship';
        formatted.locationDetail = item.vars.name;
        formatted.onClick = ({ history }) => {
          // TODO: use ship link
        };
      }
      break;
    }

    case 'InitializeAndManageAsteroid':
    case 'ManageAsteroid': {
      formatted.icon = <KeysIcon />;
      formatted.label = 'Control Asteroid';
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONTROL_ASTEROID'); // TODO: need asteroid id?
      };
      break;
    }

    case 'BulkPurchaseAdalians':
      formatted.icon = <CrewmateIcon />;
      formatted.label = 'Purchase Crewmate Credits';
      formatted.onClick = ({ openLauncher }) => {
        openLauncher('store');
      };
      break;

    case 'RecruitAdalian':
    case 'InitializeArvadian': {
      formatted.icon = <CrewIcon />;
      formatted.label = `Recruit Crewmate`;
      formatted.onClick = ({ history }) => {
        // TODO: could potentially send to station location as well, but this is probably better
        // NOTE: station is not currently set for InitializeArvadian
        if (item.vars.caller_crew?.id && item.vars.station?.id && item.vars.crewmate?.id) {
          history.push(`/recruit/${item.vars.caller_crew.id}/${item.vars.station.id}/${item.vars.crewmate.id}/create`);
        } else {
          history.push(`/crew`);
        }
      };
      break;
    }

    case 'InitializeAndPurchaseAsteroid':
    case 'PurchaseAsteroid': {
      formatted.icon = <PurchaseAsteroidIcon />;
      formatted.label = 'Purchase Asteroid';
      formatted.asteroidId = item.vars.asteroid.id;
      break;
    }

    case 'SampleDepositStart': {
      formatted.icon = <NewCoreSampleIcon />;
      formatted.label = 'Core Sample';
      formatted.asteroidId = Lot.toPosition(item.vars.lot.id)?.asteroidId;
      formatted.lotId = item.vars.lot.id;
      formatted.resourceId = item.vars.resource; // not necessarily forcing open resourcemap
      formatted.onClick = ({ openDialog }) => {
        openDialog('NEW_CORE_SAMPLE', {
          preselect: {
            resourceId: item.vars.resource,
            origin: item.vars.origin
          }
        });
      };
      break;
    }
    case 'SampleDepositImprove': {
      formatted.icon = <ImproveCoreSampleIcon />;
      formatted.label = 'Core Improvement';
      formatted.sampleId = item.vars.deposit.id;
      formatted.asteroidId = Lot.toPosition(item.meta?.lotId)?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      // formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
      formatted.onClick = ({ openDialog }) => {
        openDialog('IMPROVE_CORE_SAMPLE', {
          preselect: {
            id: item.vars.deposit.id,
            origin: item.vars.origin
            // NOTE: slot is not repopulated here (but not currently displayed anyway)
          }
        });
      };
      break;
    }
    case 'SampleDepositFinish': {
      const isImprovement = !item.meta?.isNew;
      formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />;
      formatted.label = `Core Analysis`;
      formatted.sampleId = item.vars.deposit?.id;
      formatted.asteroidId = Lot.toPosition(item.meta?.lotId)?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      // formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
      formatted.onClick = ({ openDialog }) => {
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;
    }

    case 'ScanResourcesStart': {
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Orbital Scan';
      formatted.asteroidId = item.vars.asteroid?.id;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;
    }
    case 'ScanResourcesFinish': {
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Retrieve Orbital Scan Results';
      formatted.asteroidId = item.vars.asteroid.id;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;
    }

    case 'ScanSurfaceStart': {
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Long-Range Scan';
      formatted.asteroidId = item.vars.asteroid.id;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;
    }
    case 'ScanSurfaceFinish': {
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Retrieve Long-Range Scan Results';
      formatted.asteroidId = item.vars.asteroid.id;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;
    }

    case 'TransferInventoryStart': {
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Start Transfer';
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { txHash: item.txHash });
      };
      break;
    }
    case 'TransferInventoryFinish': {
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Finish Transfer';
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;  // after start, link to destination
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { deliveryId: item.vars.delivery.id });
      };
      break;
    }

    case 'ConstructionPlan': {
      formatted.icon = <PlanBuildingIcon />;
      formatted.label = `Plan ${Building.TYPES[item.vars.building_type]?.name || 'Building'} Site`;
      formatted.asteroidId = Lot.toPosition(item.vars.lot.id)?.asteroidId;
      formatted.lotId = item.vars.lot.id;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with selected building type
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('PLAN_BUILDING');
      };
      break;
    }
    case 'ConstructionAbandon': {
      formatted.icon = <UnplanBuildingIcon />;
      formatted.label = `Abandon ${Building.TYPES[item.meta?.buildingType]?.name || 'Building'} Plans`;
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('UNPLAN_BUILDING');
      };
      break;
    }
    case 'ConstructionStart': {
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Start Construction';
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    }
    case 'ConstructionFinish': {
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Finish Construction';
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    }
    case 'ConstructionDeconstruct': {
      formatted.icon = <DeconstructIcon />;
      formatted.label = 'Deconstruct';
      formatted.asteroidId = item.meta?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('DECONSTRUCT');
      };
      break;
    }

    case 'ExtractResourceStart': {
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Product.TYPES[item.meta?.resourceId]?.name || 'Resource'} Extraction`;
      formatted.asteroidId = Lot.toPosition(item.meta?.lotId)?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      // formatted.resourceId = item.meta?.resourceId;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with sample preset, destination, slot, and amount selection
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('EXTRACT_RESOURCE');
      };
      break;
    }
    case 'ExtractResourceFinish': {
      formatted.icon = <ExtractionIcon />;
      formatted.label = 'Finish Extraction';
      formatted.asteroidId = Lot.toPosition(item.meta?.lotId)?.asteroidId;
      formatted.lotId = item.meta?.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('EXTRACT_RESOURCE');
      };
      break;
    }

    default:
      console.log('Unhandled ActionItems tx', item);
      break;
  }

  if (formatted?.asteroidId) formatted.asteroidId = Number(formatted.asteroidId);
  if (formatted?.lotId) formatted.lotId = Number(formatted.lotId);
  if (formatted?.resourceId) formatted.resourceId = Number(formatted.resourceId);
  return formatted;
};

export const formatActionItem = (item, actionItem) => {
  try {
    if (item.type === 'pending' || item.type === 'failed') return formatAsTx(item);
    if (item.type === 'plans') return formatAsPlans(item);
    return formatAsItem(item, actionItem);
  } catch (e) {
    console.error('Error formatting action item', item, e);
    return null;
  }
}

export const itemColors = {
  pending: hexToRGB(theme.colors.purple),
  failed: hexToRGB(theme.colors.error),
  ready: theme.colors.successRGB,
  unready: theme.colors.mainRGB,
  plans: '248, 133, 44',
};

export const statuses = {
  pending: 'Processing',
  failed: 'Failed',
  ready: 'Ready',
  unready: '',
  plans: ''
};