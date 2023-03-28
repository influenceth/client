import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { AiOutlineExclamation as FailureIcon, AiFillPushpin as UnpinIcon, AiOutlinePushpin as PinIcon } from 'react-icons/ai';
import { MdClear as DismissIcon } from 'react-icons/md';
import BarLoader from 'react-spinners/BarLoader';
import { Capable, Inventory } from '@influenceth/sdk';
import moment from 'moment';

import {
  UnplanBuildingIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  CrewMemberIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  SurfaceTransferIcon,
  LinkIcon,
  PopoutIcon,
} from '~/components/Icons';
import CollapsibleSection from '~/components/CollapsibleSection';
import LiveTimer from '~/components/LiveTimer';
import NavIcon from '~/components/NavIcon';
import OnClickLink from '~/components/OnClickLink';
import { useLotLink } from '~/components/LotLink';
import useActionItems from '~/hooks/useActionItems';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import theme, { hexToRGB } from '~/theme';

const ICON_WIDTH = 34;
const ITEM_WIDTH = 400;
const TRANSITION_TIME = 400;

const ActionItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  transition: width 0.15s ease;
  user-select: none;
  width: ${ITEM_WIDTH}px;
`;

const Filters = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  width: 100%;
`;
const Filter = styled.div`
  border-radius: 20px;
  cursor: ${p => p.theme.cursors.active};
  font-size: 90%;
  margin-right: 8px;
  padding: 3px 12px;
  &:before {
    content: "${p => p.tally}";
    color: white;
    margin-right: 8px;
  }
`;
const ReadyFilter = styled(Filter)`
  background: rgba(${p => hexToRGB(p.theme.colors.success)}, 0.2);
  border: 1px solid ${p => p.selected ? `rgba(${hexToRGB(p.theme.colors.success)}, 0.5)` : 'transparent'};
  &:hover {
    border: 1px solid rgba(${p => hexToRGB(p.theme.colors.success)}, 0.3);
  }
  &:after {
    content: "Ready";
    color: ${p => p.theme.colors.success};
  }
`;
const InProgressFilter = styled(Filter)`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border: 1px solid ${p => p.selected ? `rgba(${p.theme.colors.mainRGB}, 0.5)` : 'transparent'};
  &:hover {
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
  }
  &:after {
    content: "In Progress";
    color: ${p => p.theme.colors.main};
  }
`;
const LinkContainer = styled.div`
  flex: 1;
  text-align: right;
  & > span {
    color: ${p => p.theme.colors.main};
  }
`;

const Pinner = styled.div`
  align-items: center;
  border-bottom: 2px solid black;
  color: #CCC;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 14px;
  height: 28px;
  justify-content: center;
  opacity: 0;
  pointer-events: all;
  position: absolute;
  right: 8px;
  top: -28px;
  width: 100px;
  transition: opacity 0.25s ease 0.15s;
  & > svg { margin-right: 2px; }
`;

const OuterWrapper = styled.div`
  flex: 1;
  height: 0;
  pointer-events: none;
  position: relative;
`;

const ActionItemContainer = styled.div`
  max-height: 275px;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  width: ${ITEM_WIDTH}px;
`;

const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;
const Icon = styled.div`
  & svg {
    filter: drop-shadow(1px 1px 1px #333);
    ${p => p.animate && css`
      animation: ${opacityKeyframes} 1000ms ease infinite;
    `}
  }
`;

const Status = styled.div``;
const Label = styled.div``;
const Details = styled.div``;
const Timing = styled.div`
  b {
    font-weight: normal;
    text-transform: uppercase;
  }
`;
const Location = styled.div`
  color: rgba(255, 255, 255, 0.6);
  b {
    color: white;
    font-weight: normal;
    &:after {
      content: '>';
      color: rgba(255, 255, 255, 0.6);
      display: inline-block;
      padding: 0 5px;
    }
  }
`;
const Dismissal = styled.div`
  align-items: center;
  color: white;
  display: flex;
  & > div {
    align-items: center;
    border: 1px solid orangered;
    color: ${p => p.theme.colors.error};
    display: flex;
    font-size: 20px;
    justify-content: center;
    margin-left: 4px;
  }
  &:hover {
    & > div {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }
  }
`;
const Progress = styled.div``;
const ActionItemRow = styled.div`
  align-items: center;
  overflow: hidden;
  pointer-events: all;
  text-shadow: 1px 1px 2px black;

  ${p => {
    if (p.transitionOut === 'right') {
      return `
        background: rgba(255, 255, 255, 0.9);
        height: 0;
        margin-bottom: 0;
        transform: translateX(${ITEM_WIDTH});
        & > * { opacity: 0; }
      `;
    } else if (p.transitionOut === 'left') {
      return `
        height: 0;
        margin-bottom: 0;
        opacity: 0;
        transform: translateX(-${ITEM_WIDTH});
      `;
    }
    return `
      background: rgba(${p.color}, 0.2);
      color: rgb(${p.color});
      height: 34px;
      margin-bottom: 2px;
      opacity: 1;
      transform: translateX(0);
      &:hover {
        background: rgba(${p.color}, 0.4);
        ${!p.oneRow && `
          ${Details} > * {
            transform: translateY(-34px);
          }
        `}
      }
    `;
  }}

  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 85%;
  position: relative;
  transition:
    opacity ${TRANSITION_TIME * 0.75}ms ease,
    transform ${TRANSITION_TIME * 0.75}ms ease,
    height ${TRANSITION_TIME * 0.25}ms ease ${TRANSITION_TIME * 0.75}ms,
    margin-bottom 1ms ease ${TRANSITION_TIME * 0.75}ms;
  ${Icon} {
    align-items: center;
    background: rgba(${p => p.color}, 0.2);
    display: flex;
    font-size: 24px;
    justify-content: center;
    margin-right: 8px;
    height: 100%;
    width: ${ICON_WIDTH}px;
  }
  ${Status} {
    margin-right: 8px;
    text-transform: uppercase;
  }
  ${Label} {
    color: white;
    flex: 1;
  }
  ${Details} {
    height: 100%;
    margin-right: 8px;
    overflow: hidden;
    & > * {
      align-items: center;
      display: flex;
      height: 100%;
      justify-content: flex-end;
      transition: transform 150ms ease;
    }
  }
  ${Progress} {
    position: absolute;
    bottom: 0;
    left: ${ICON_WIDTH}px;
    height: 4px;
    right: 0;
    & > * {
      display: block;
      width: 100%;
    }
  }
`;

const formatItem = (item) => {
  const formatted = {
    key: item.key,
    icon: null,
    label: '',
    asteroidId: null,
    lotId: null,
    resourceId: null,
    locationDetail: '',
    completionTime: item.data?.completionTime || 0,
    ago: (new moment(new Date(1000 * (item.data?.completionTime || 0)))).fromNow(),
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
      formatted.locationDetail = Inventory.RESOURCES[item.event.returnValues?.resourceId].name;
      formatted.onClick = ({ openDialog }) => {
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;

    case 'Dispatcher_ConstructionStart':
      formatted.icon = <ConstructIcon />;
      formatted.label = `${Capable.TYPES[item.assets.building.type]?.name || 'Building'} Construction`;
      formatted.asteroidId = item.assets.asteroid.i;
      formatted.lotId = item.assets.lot.i;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;

    case 'Dispatcher_ExtractionStart':
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Inventory.RESOURCES[item.event.returnValues?.resourceId]?.name || 'Resource'} Extraction`;
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
  return formatted;
};

const formatPlans = (item) => {
  return {
    key: item.key,
    icon: <PlanBuildingIcon />,
    label: `${item.building.type} Site Plan`,
    crewId: item.occupier,
    asteroidId: item.asteroid,
    lotId: item.i,
    resourceId: null,
    locationDetail: '',
    completionTime: item.waitingFor,
    onClick: ({ openDialog }) => {
      openDialog('CONSTRUCT');
    }
  };
};

const formatTx = (item) => {
  const formatted = {
    key: item.key,
    txHash: item.txHash,
    icon: null,
    label: '',
    crewId: null,
    asteroidId: null,
    lotId: null,
    resourceId: null,
    locationDetail: '',
    completionTime: null,
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
      formatted.icon = <CrewMemberIcon />;
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
      formatted.label = `Plan ${Capable.TYPES[item.vars.capableType]?.name || 'Building'} Site`;
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
      formatted.label = `${Inventory.RESOURCES[item.vars.resourceId]?.name || 'Resource'} Extraction`;
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
  return formatted;
};

const itemColors = {
  pending: hexToRGB(theme.colors.purple),
  failed: hexToRGB(theme.colors.error),
  ready: theme.colors.successRGB,
  unready: theme.colors.mainRGB,
  plans: '248, 133, 44',
};

const statuses = {
  pending: 'Processing',
  failed: 'Failed',
  ready: 'Ready',
  unready: '',
  plans: ''
};

const ActionItem = ({ data, type }) => {
  const history = useHistory();
  const currentAsteroid = useStore(s => s.asteroids);
  const dispatchActionDialog = useStore(s => s.dispatchActionDialog);
  const dismissFailedTx = useStore(s => s.dispatchFailedTransactionDismissed);

  // TODO: can probably clean up the `formatted` structure
  const item = useMemo(() => {
    if (type === 'pending' || type === 'failed') return formatTx(data, history);
    if (type === 'plans') return formatPlans(data);
    return formatItem(data);
  }, [data]);

  const { data: asteroid } = useAsteroid(item.asteroidId);
  const { data: lot } = useLot(item.asteroidId, item.lotId);

  const goToAction = useLotLink({
    asteroidId: item.asteroidId,
    lotId: item.lotId,
    resourceId: item.resourceId,
  });

  const onClick = useCallback(() => {
    if (item.asteroidId) {
      goToAction();
    }
    // return;

    if (item.onClick) {
      // delay dialog opening based on how far camera needs to fly to get there
      let dialogDelay = 0;
      if (item.asteroidId && (currentAsteroid.origin !== item.asteroidId || currentAsteroid.zoomStatus !== 'in')) {
        dialogDelay = 3250;
        if (item.lotId) dialogDelay += 750;
      } else if (item.lotId && currentAsteroid.lot?.lotId !== item.lotId) {
        dialogDelay = 400;
      }
      setTimeout(() => {
        item.onClick({
          openDialog: (dialog, vars) => dispatchActionDialog(dialog, { asteroidId: item.asteroidId, lotId: item.lotId, ...vars }),
          history,
          asteroid,
          lot
        });
      }, dialogDelay)
    }

    if (type === 'failed' && item.txHash && process.env.REACT_APP_STARKNET_EXPLORER_URL) {
      window.open(`${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${item.txHash}`, '_blank');
    }
  }, [
    goToAction,
    currentAsteroid?.origin,
    currentAsteroid?.lot?.lotId,
    currentAsteroid?.zoomStatus,
    item.asteroidId,
    item.lotId,
    item.onClick
  ]);

  const onDismiss = useCallback((e) => {
    e.stopPropagation();
    dismissFailedTx(item._timestamp);
    return false;
  }, [item]);

  return (
    <ActionItemRow
      color={itemColors[type]}
      onClick={onClick}
      oneRow={type !== 'failed' && !asteroid}
      transitionOut={data.transitionOut ? (type === 'failed' ? 'left' : 'right') : undefined}>
      <Icon animate={type === 'pending'}>
        {type === 'failed' && <FailureIcon />}
        {type === 'ready' && <NavIcon animate selected size="16px" />}
        {(type === 'pending' || type === 'unready' || type === 'plans') && item.icon}
      </Icon>
      <Status>{statuses[type]}</Status>
      <Label>{item.label}</Label>
      <Details>
        <Timing>
          {type === 'pending' && 'Just Now'}
          {(type === 'ready' || type === 'failed') && item.ago}
          {type === 'unready' && item.completionTime && <LiveTimer target={item.completionTime} maxPrecision={2} prefix="in " />}
          {/* TODO: would be nice for this to have different level warning intensity based on time-left and/or presence of inventory on the lot */}
          {type === 'plans' && (
            item.completionTime
              ? <LiveTimer target={item.completionTime} maxPrecision={2} prefix="remaining " />
              : <b>at risk</b>
          )}
        </Timing>
        {type === 'failed' && (
          <Dismissal onClick={onDismiss}>
            Dismiss <div><DismissIcon /></div>
          </Dismissal>
        )}
        {type !== 'failed' && asteroid && (
          <Location>
            {item.locationDetail && <><b>{item.locationDetail}</b></>}
            <span>{asteroid.customName || asteroid.baseName}</span>
          </Location>
        )}
      </Details>
      {type === 'pending' && (
        <Progress>
          <BarLoader color="currentColor" />
        </Progress>
      )}
    </ActionItemRow>
  )
};

const ActionItems = () => {
  const {
    pendingTransactions,
    failedTransactions,
    readyItems: allReadyItems,
    unreadyItems,
    plannedItems: allPlannedItems
  } = useActionItems() || {};

  const { token, account } = useAuth();

  // hide readyItems that have a pending transaction
  const readyItems = useMemo(() => {
    return allReadyItems.filter((item) => {
      if (pendingTransactions) {
        switch (item.event.name) {
          case 'Dispatcher_AsteroidStartScan':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_ASTEROID_SCAN'
              && tx.vars.i === item.event.returnValues?.asteroidId
            ));
          case 'Dispatcher_CoreSampleStartSampling':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_CORE_SAMPLE'
              && tx.vars.asteroidId === item.event.returnValues?.asteroidId
              && tx.vars.lotId === item.event.returnValues?.lotId
            ));
          case 'Dispatcher_ConstructionStart':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_CONSTRUCTION'
              && tx.vars.asteroidId === item.assets.asteroid.i
              && tx.vars.lotId === item.assets.lot.i
            ));
          case 'Dispatcher_ExtractionStart':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_EXTRACTION'
              && tx.vars.asteroidId === item.event.returnValues?.asteroidId
              && tx.vars.lotId === item.event.returnValues?.lotId
            ));
          case 'Dispatcher_InventoryTransferStart':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_DELIVERY'
              && tx.vars.asteroidId === item.event.returnValues?.asteroidId
              && tx.vars.destLotId === item.event.returnValues?.destinationLotId
              && tx.vars.deliveryId === item.assets.delivery?.deliveryId
            ));
        }
      }
      return true;
    });
  }, [pendingTransactions, allReadyItems]);

  const plannedItems = useMemo(() => {
    return allPlannedItems.filter((item) => {
      if (pendingTransactions) {
        return !pendingTransactions.find((tx) => (
          ['START_CONSTRUCTION', 'UNPLAN_CONSTRUCTION'].includes(tx.key)
          && tx.vars.asteroidId === item.asteroid
          && tx.vars.lotId === item.i
        ));
      }
      return true;
    });
  }, [pendingTransactions, allPlannedItems]);

  const allItems = useMemo(() => {
    if (!account || !token) return [];

    return [
      ...(pendingTransactions || []).map((item) => ({ ...item, type: 'pending' })),
      ...(failedTransactions || []).map((item) => ({ ...item, type: 'failed' })),
      ...(readyItems || []).map((item) => ({ ...item, type: 'ready' })),
      ...(plannedItems || []).map((item) => ({ ...item, type: 'plans' })),
      ...(unreadyItems || []).map((item) => ({ ...item, type: 'unready' }))
    ].map((x) => {  // make sure everything has a key
      if (!x.key) x.key = `${x.type}_${x.txHash || x.id || x.timestamp || x.gracePeriodEnd}`;
      return x;
    });
  }, [pendingTransactions, failedTransactions, readyItems, plannedItems, unreadyItems, account, token]);

  const [displayItems, setDisplayItems] = useState();
  useEffect(() => {
    if (displayItems) {
      // TODO: maybe this should show new ones while transitioning out old ones?
      // set to transition state
      setDisplayItems((items) => {
        items.forEach((item) => {
          if (!allItems.find((i) => i.key === item.key)) {
            item.transitionOut = true;
          }
        });
        return items;
      });

      // after TRANSITION_TIME, update to post-transition
      setTimeout(() => {
        setDisplayItems(allItems);
      }, TRANSITION_TIME);
    } else {
      setDisplayItems(allItems);
    }
  }, [allItems]);

  const [selectedFilter, setSelectedFilter] = useState('ready');
  const [lastClick, setLastClick] = useState();

  const onClickFilter = useCallback((filter) => (e) => {
    e.stopPropagation();
    setSelectedFilter(filter);
    setLastClick(Date.now());
  }, []);

  const tallies = useMemo(() => {
    return (displayItems || []).reduce(
      (acc, cur) => {
        if (cur.type === 'ready' || cur.type === 'plans') acc.ready++;
        if (cur.type === 'unready') acc.progress++;
        return acc;
      },
      {
        ready: 0,
        progress: 0
      }
    )
  }, [displayItems]);

  const filteredDisplayItems = useMemo(() => {
    const filter = selectedFilter === 'ready'
      ? (i) => i.type !== 'unready'
      : (i) => i.type !== 'ready' && i.type !== 'plans';
    return (displayItems || []).filter(filter)
  }, [displayItems, selectedFilter]);

  return (
    <OuterWrapper>
      {account && (
        <CollapsibleSection
          borderless
          openOnChange={lastClick}
          title={(
            <Filters>
              <ReadyFilter tally={tallies.ready} onClick={onClickFilter('ready')} selected={selectedFilter === 'ready'} />
              <InProgressFilter tally={tallies.progress} onClick={onClickFilter('progress')} selected={selectedFilter === 'progress'} />
              <LinkContainer>
                <OnClickLink>
                  <PopoutIcon />
                </OnClickLink>
              </LinkContainer>
            </Filters>
          )}>
          <ActionItemWrapper>
            <ActionItemContainer>
              {filteredDisplayItems.map(({ transition, type, ...item }) => (
                <ActionItem key={`${type}_${item.key || item.i}_${item.timestamp || item.gracePeriodEnd}`} data={item} type={type} />
              ))}
            </ActionItemContainer>
          </ActionItemWrapper>
        </CollapsibleSection>
      )}
    </OuterWrapper>
  );
};

export default ActionItems;