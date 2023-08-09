import { Building, Product } from '@influenceth/sdk';
import moment from 'moment';

import {
  UnplanBuildingIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  CrewmateIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  SurfaceTransferIcon,
} from '~/components/Icons';
import theme, { hexToRGB } from '~/theme';

const formatAsItem = (item) => {
  const formatted = {
    key: item.key,
    type: item.type,
    icon: null,
    label: '',
    asteroidId: null,
    lotId: null,
    resourceId: null,
    locationDetail: '',
    finishTime: item.data?.finishTime || 0,
    startTime: item.data?.startTime || 0,
    ago: (new moment(new Date(1000 * (item.data?.finishTime || 0)))).fromNow(),
    onClick: null
  };

  switch(item.event.name) {
    case 'Dispatcher_AsteroidStartScan':
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Asteroid Scan';
      formatted.asteroidId = item.event.returnValues?.asteroidId;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;

    case 'Dispatcher_CoreSampleStartSampling':
      const isImprovement = item.assets?.coreSample?.initialYield > 0;
      formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />;
      formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
      formatted.asteroidId = item.event.returnValues?.asteroidId;
      formatted.lotId = item.event.returnValues?.lotId;
      formatted.resourceId = item.event.returnValues?.resourceId;
      formatted.locationDetail = Product.TYPES[item.event.returnValues?.resourceId].name;
      formatted.onClick = ({ openDialog }) => {
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;

    case 'Dispatcher_ConstructionStart':
      formatted.icon = <ConstructIcon />;
      formatted.label = `${Building.TYPES[item.assets.building.type]?.name || 'Building'} Construction`;
      formatted.asteroidId = item.assets.asteroid.i;
      formatted.lotId = item.assets.lot.i;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;

    case 'Dispatcher_ExtractionStart':
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Product.TYPES[item.event.returnValues?.resourceId]?.name || 'Resource'} Extraction`;
      formatted.asteroidId = item.event.returnValues?.asteroidId;
      formatted.lotId = item.event.returnValues?.lotId;
      formatted.resourceId = item.event.returnValues?.resourceId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('EXTRACT_RESOURCE');
      };
      break;

    case 'Dispatcher_InventoryTransferStart':
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Surface Transfer';
      formatted.asteroidId = item.event.returnValues?.asteroidId;
      formatted.lotId = item.event.returnValues?.destinationLotId;  // after start, link to destination
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { deliveryId: item.assets.delivery?.deliveryId });
      };
      break;

    default:
      console.log('Unhandled ActionItem', item);
      break;
  }

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
    crewId: item.occupier,
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
  switch(item.event?.event || item.key) {
    case 'PURCHASE_ASTEROID':
      formatted.icon = <PurchaseAsteroidIcon />;
      formatted.label = 'Purchase Asteroid';
      formatted.asteroidId = item.vars.i;
      break;

    case 'NAME_ASTEROID':
      formatted.icon = <PurchaseAsteroidIcon />;
      formatted.label = 'Name Asteroid';
      formatted.asteroidId = item.vars.i;
      formatted.locationDetail = item.vars.name;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}`);
      };
      break;

    case 'START_ASTEROID_SCAN':
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Asteroid Scan';
      formatted.asteroidId = item.vars.i;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;
    case 'FINISH_ASTEROID_SCAN':
      formatted.icon = <ScanAsteroidIcon />;
      formatted.label = 'Retrieve Scan Results';
      formatted.asteroidId = item.vars.i;
      formatted.onClick = ({ history }) => {
        history.push(`/asteroids/${formatted.asteroidId}/resources`);
      };
      break;

    case 'SET_ACTIVE_CREW':
      formatted.icon = <CrewIcon />;
      formatted.label = 'Update Crew';
      formatted.onClick = ({ history }) => {
        history.push(`/owned-crew`);
      };
      break;
    case 'NAME_CREW':
      formatted.icon = <CrewmateIcon />;
      formatted.label = 'Name Crewmate';
      formatted.onClick = ({ history }) => {
        history.push(`/crew/${item.vars.i}`);
      };
      break;
    case 'INITIALIZE_CREWMATE':
      formatted.icon = <CrewIcon />;
      formatted.label = 'Initialize Crewmate';
      formatted.onClick = ({ history }) => {
        if (item.vars.sessionId) {
          history.push(`/crew-assignment/${item.vars.sessionId}/create`);
        } else {
          history.push(`/owned-crew`);
        }
      };
      break;
    case 'PURCHASE_AND_INITIALIZE_CREWMATE':
      formatted.icon = <CrewIcon />;
      formatted.label = 'Mint Crewmate';
      formatted.onClick = ({ history }) => {
        if (item.vars.sessionId) {
          history.push(`/crew-assignment/${item.vars.sessionId}/create`);
        } else {
          history.push(`/owned-crew`);
        }
      };
      break;

    case 'START_CORE_SAMPLE':
      const isImprovement = item.vars.sampleId > 0;
      formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />;
      formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure (and improvement mode), should link with selected sampleId
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;
    case 'FINISH_CORE_SAMPLE':
      formatted.icon = <NewCoreSampleIcon />;
      formatted.label = `Core Analysis`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.resourceId = item.vars.resourceId; // not necessarily forcing open resourcemap
      formatted.onClick = ({ openDialog, lot }) => {
        const isImprovement = item.vars.sampleId && lot?.coreSamples?.length > 0 && !!lot.coreSamples.find((s) => (
          s.sampleId === item.vars.sampleId
          && s.resourceId === formatted.resourceId
          && s.initialYield > 0
        ));
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;

    case 'PLAN_CONSTRUCTION':
      formatted.icon = <PlanBuildingIcon />;
      formatted.label = `Plan ${Building.TYPES[item.vars.capableType]?.name || 'Building'} Site`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with selected building type
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('PLAN_BUILDING');
      };
      break;
    case 'UNPLAN_CONSTRUCTION':
      formatted.icon = <UnplanBuildingIcon />;
      formatted.label = 'Unplan Building Site';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('UNPLAN_BUILDING');
      };
      break;
    case 'START_CONSTRUCTION':
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Start Construction';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    case 'FINISH_CONSTRUCTION':
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Finish Construction';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    case 'DECONSTRUCT':
      formatted.icon = <DeconstructIcon />;
      formatted.label = 'Deconstruct';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('DECONSTRUCT');
      };
      break;

    case 'START_EXTRACTION':
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Product.TYPES[item.vars.resourceId]?.name || 'Resource'} Extraction`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.resourceId = item.vars.resourceId;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with sample preset, destination, and amount selection
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('EXTRACT_RESOURCE');
      };
      break;
    case 'FINISH_EXTRACTION':
      formatted.icon = <ExtractionIcon />;
      formatted.label = 'Finish Extraction';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.lotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('EXTRACT_RESOURCE');
      };
      break;

    case 'START_DELIVERY':
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Start Transfer';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.originLotId;  // at start, link to origin (in case of failure)
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with selected resource and destination
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('SURFACE_TRANSFER');
      };
      break;
    case 'FINISH_DELIVERY':
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Finish Transfer';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.lotId = item.vars.destLotId;  // after start, link to destination
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { deliveryId: item.vars.deliveryId });
      };
      break;
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