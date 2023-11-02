import { Building, Entity, Product } from '@influenceth/sdk';
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
} from '~/components/Icons';
import getActivityConfig from '~/lib/activities';
import theme, { hexToRGB } from '~/theme';

// TODO: ecs refactor

const formatAsItem = (activity) => {
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
    onClick: null
  };

  const { actionItem } = getActivityConfig(activity);
  Object.keys(actionItem || {}).forEach((key) => {
    formatted[key] = actionItem[key];
  });

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
    label: `${item.building.type} Site Plan`,
    crewId: item.occupier,  // TODO: ecs refactor -- occupier?
    asteroidId: Number(item.asteroid),
    lotId: Number(item.i),
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

    case 'ScanResourcesStart': {
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Orbital Scan';
      formatted.asteroidId = item.vars.asteroid.id;
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

    // TODO: ecs refactor
    // ExchangeCrew, PurchaseAdalian
    // TODO: ecs refactor
    // use Systems from sdk to determine missing items here

    // TODO: ...
    // case 'SET_ACTIVE_CREW':
    //   formatted.icon = <CrewIcon />;
    //   formatted.label = 'Update Crew';
    //   formatted.onClick = ({ history }) => {
    //     history.push(`/crew`);
    //   };
    //   break;

    // case 'START_CORE_SAMPLE':
    //   const isImprovement = item.vars.sampleId > 0;
    //   formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />;
    //   formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
    //   formatted.onClick = ({ openDialog }) => {
    //     // TODO: in case of failure (and improvement mode), should link with selected sampleId
    //     // (low priority b/c would have to fail and would have to have closed dialog)
    //     openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
    //   };
    //   break;
    // case 'FINISH_CORE_SAMPLE':
    //   formatted.icon = <NewCoreSampleIcon />;
    //   formatted.label = `Core Analysis`;
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
    //   formatted.onClick = ({ openDialog, lot }) => {
    //     const isImprovement = item.vars.sampleId && lot?.coreSamples?.length > 0 && !!lot.coreSamples.find((s) => (
    //       s.sampleId === item.vars.sampleId
    //       && s.resourceId === formatted.resourceId
    //       && s.initialYield > 0
    //     ));
    //     openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
    //   };
    //   break;

    // case 'PLAN_CONSTRUCTION':
    //   formatted.icon = <PlanBuildingIcon />;
    //   formatted.label = `Plan ${Building.TYPES[item.vars.buildingType]?.name || 'Building'} Site`;
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     // TODO: in case of failure, should link with selected building type
    //     // (low priority b/c would have to fail and would have to have closed dialog)
    //     openDialog('PLAN_BUILDING');
    //   };
    //   break;
    // case 'UNPLAN_CONSTRUCTION':
    //   formatted.icon = <UnplanBuildingIcon />;
    //   formatted.label = 'Unplan Building Site';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('UNPLAN_BUILDING');
    //   };
    //   break;
    // case 'START_CONSTRUCTION':
    //   formatted.icon = <ConstructIcon />;
    //   formatted.label = 'Start Construction';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('CONSTRUCT');
    //   };
    //   break;
    // case 'FINISH_CONSTRUCTION':
    //   formatted.icon = <ConstructIcon />;
    //   formatted.label = 'Finish Construction';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('CONSTRUCT');
    //   };
    //   break;
    // case 'DECONSTRUCT':
    //   formatted.icon = <DeconstructIcon />;
    //   formatted.label = 'Deconstruct';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('DECONSTRUCT');
    //   };
    //   break;

    // case 'START_EXTRACTION':
    //   formatted.icon = <ExtractionIcon />;
    //   formatted.label = `${Product.TYPES[item.vars.resourceId]?.name || 'Resource'} Extraction`;
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.resourceId = item.vars.resourceId;
    //   formatted.onClick = ({ openDialog }) => {
    //     // TODO: in case of failure, should link with sample preset, destination, and amount selection
    //     // (low priority b/c would have to fail and would have to have closed dialog)
    //     openDialog('EXTRACT_RESOURCE');
    //   };
    //   break;
    // case 'FINISH_EXTRACTION':
    //   formatted.icon = <ExtractionIcon />;
    //   formatted.label = 'Finish Extraction';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.lotId;
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('EXTRACT_RESOURCE');
    //   };
    //   break;

    // case 'START_DELIVERY':
    //   formatted.icon = <SurfaceTransferIcon />;
    //   formatted.label = 'Start Transfer';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.originLotId;  // at start, link to origin (in case of failure)
    //   formatted.onClick = ({ openDialog }) => {
    //     // TODO: in case of failure, should link with selected resource and destination
    //     // (low priority b/c would have to fail and would have to have closed dialog)
    //     openDialog('SURFACE_TRANSFER');
    //   };
    //   break;
    // case 'FINISH_DELIVERY':
    //   formatted.icon = <SurfaceTransferIcon />;
    //   formatted.label = 'Finish Transfer';
    //   formatted.asteroidId = item.vars.asteroidId;
    //   formatted.lotId = item.vars.destLotId;  // after start, link to destination
    //   formatted.onClick = ({ openDialog }) => {
    //     openDialog('SURFACE_TRANSFER', { deliveryId: item.vars.deliveryId });
    //   };
    //   break;
    default:
      console.log('Unhandled ActionItems tx', item);
      break;
  }

  if (formatted?.asteroidId) formatted.asteroidId = Number(formatted.asteroidId);
  if (formatted?.lotId) formatted.lotId = Number(formatted.lotId);
  if (formatted?.resourceId) formatted.resourceId = Number(formatted.resourceId);
  return formatted;
};

export const formatActionItem = (item) => {
  if (item.type === 'pending' || item.type === 'failed') return formatAsTx(item);
  if (item.type === 'plans') return formatAsPlans(item);
  return formatAsItem(item);
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