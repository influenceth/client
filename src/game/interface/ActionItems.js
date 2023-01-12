import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { AiOutlineExclamation as FailureIcon } from 'react-icons/ai';
import { MdClear as DismissIcon } from 'react-icons/md';
import BarLoader from 'react-spinners/BarLoader';
import { Capable, Inventory } from '@influenceth/sdk';
import moment from 'moment';

import {
  CancelBlueprintIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  CrewMemberIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
  PurchaseAsteroidIcon,
  ScanAsteroidIcon,
  SurfaceTransferIcon,
} from '~/components/Icons';
import NavIcon from '~/components/NavIcon';
import { usePlotLink } from '~/components/PlotLink';
import useActionItems from '~/hooks/useActionItems';
import useAsteroid from '~/hooks/useAsteroid';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import theme, { hexToRGB } from '~/theme';
import { LiveTimer } from './sceneMenu/actionDialogs/components';

const iconWidth = 30;

const TRANSITION_TIME = 400;
const ITEM_WIDTH = `400px`;

const ActionItemContainer = styled.div`
  pointer-events: all;
  position: absolute;
  left: 0;
  top: 120px;
  height: 275px;
  overflow-x: hidden;
  overflow-y: auto;
  width: ${ITEM_WIDTH};
`;

const Icon = styled.div``;
const Status = styled.div``;
const Label = styled.div``;
const Details = styled.div``;
const Timing = styled.div``;
const Warning = styled.span`
  color: ${p => p.theme.colors.error};
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
    width: ${iconWidth}px;
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
    left: ${iconWidth}px;
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
    key: item.id,
    icon: null,
    label: '',
    asteroidId: null,
    plotId: null,
    resourceId: null,
    locationDetail: '',
    completionTime: item.data?.completionTime || 0,
    ago: (new moment(new Date(1000 * (item.data?.completionTime || 0)))).fromNow(),
    onClick: null,
    _item: item
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
      const isImprovement = item.assets?.initialYield > 0;
      formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <CoreSampleIcon />;
      formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
      formatted.asteroidId = item.event.returnValues?.asteroidId;
      formatted.plotId = item.event.returnValues?.lotId;
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
      formatted.plotId = item.assets.lot.i;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;

    case 'Dispatcher_ExtractionStart':
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Capable.TYPES[item.event.returnValues?.resourceId]?.name || 'Resource'} Extraction`;
      formatted.asteroidId = item.assets.asteroid.i;
      formatted.plotId = item.assets.lot.i;
      formatted.resourceId = item.event.returnValues?.resourceId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('EXTRACT_RESOURCE');
      };
      break;

    case 'Dispatcher_InventoryTransferStart':
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Surface Transfer';
      formatted.asteroidId = item.assets.asteroid.i;
      // TODO: investigate if this lot is the origin or destination
      formatted.plotId = item.assets.lot.i;  // after start, link to destination
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { deliveryId: item.event.returnValues?.deliveryId });
      };
      break;
    default:
      console.warn('Unhandled action item', item);
      break;
  }
  return formatted;
};

const formatPlans = (item) => {
  return {
    key: `plans_${item.gracePeriodEnd}`,
    icon: <LayBlueprintIcon />,
    label: `${item.building.type} Site Plan`,
    crewId: item.occupier,
    asteroidId: item.asteroid,
    plotId: item.i,
    resourceId: null,
    locationDetail: '',
    completionTime: item.gracePeriodEnd,
    onClick: ({ openDialog }) => {
      openDialog('CONSTRUCT');
    }
  };
};

const formatTx = (item) => {
  const formatted = {
    key: item.txHash || item.timestamp,
    icon: null,
    label: '',
    crewId: null,
    asteroidId: null,
    plotId: null,
    resourceId: null,
    locationDetail: '',
    completionTime: null,
    onClick: null,
    _item: item
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
    case 'PURCHASE_AND_INITIALIZE_CREW':
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
      formatted.icon = isImprovement ? <ImproveCoreSampleIcon /> : <CoreSampleIcon />;
      formatted.label = `Core ${isImprovement ? 'Improvement' : 'Sample'}`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.resourceId = item.vars.resourceId;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure (and improvement mode), should link with selected sampleId
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;
    case 'FINISH_CORE_SAMPLE':
      formatted.icon = <CoreSampleIcon />;
      formatted.label = `Core Analysis`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.resourceId = item.vars.resourceId;
      formatted.onClick = ({ openDialog, plot }) => {
        const isImprovement = item.vars.sampleId && plot?.coreSamples?.length > 0 && !!plot.coreSamples.find((s) => (
          s.sampleId === item.vars.sampleId
          && s.resourceId === formatted.resourceId
          && s.initialYield > 0
        ));
        openDialog(isImprovement ? 'IMPROVE_CORE_SAMPLE' : 'NEW_CORE_SAMPLE');
      };
      break;

    case 'PLAN_CONSTRUCTION':
      formatted.icon = <LayBlueprintIcon />;
      formatted.label = `Plan ${Capable.TYPES[item.vars.capableType]?.name || 'Building'} Site`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        // TODO: in case of failure, should link with selected building type
        // (low priority b/c would have to fail and would have to have closed dialog)
        openDialog('BLUEPRINT');
      };
      break;
    case 'UNPLAN_CONSTRUCTION':
      formatted.icon = <CancelBlueprintIcon />;
      formatted.label = 'Cancel Building Plans';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CANCEL_BLUEPRINT');
      };
      break;
    case 'START_CONSTRUCTION':
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Start Construction';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    case 'FINISH_CONSTRUCTION':
      formatted.icon = <ConstructIcon />;
      formatted.label = 'Finish Construction';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('CONSTRUCT');
      };
      break;
    case 'DECONSTRUCT':
      formatted.icon = <DeconstructIcon />;
      formatted.label = 'Deconstruct';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('DECONSTRUCT');
      };
      break;

    case 'START_EXTRACTION':
      formatted.icon = <ExtractionIcon />;
      formatted.label = `${Inventory.RESOURCES[item.vars.resourceId]?.name || 'Resource'} Extraction`;
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.plotId;
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
      formatted.plotId = item.vars.plotId;
      formatted.onClick = ({ openDialog }) => {
        openDialog('EXTRACT_RESOURCE');
      };
      break;

    case 'START_DELIVERY':
      formatted.icon = <SurfaceTransferIcon />;
      formatted.label = 'Start Transfer';
      formatted.asteroidId = item.vars.asteroidId;
      formatted.plotId = item.vars.originPlotId;  // at start, link to origin (in case of failure)
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
      formatted.plotId = item.vars.destPlotId;  // after start, link to destination
      formatted.onClick = ({ openDialog }) => {
        openDialog('SURFACE_TRANSFER', { deliveryId: item.vars.deliveryId });
      };
      break;
    default:
      console.log(item);
      break;
  }
  return formatted;
};

const itemColors = {
  pending: hexToRGB(theme.colors.purple),
  failed: hexToRGB(theme.colors.error),
  ready: theme.colors.mainRGB,
  unready: '90, 90, 90',
  plans: '90, 90, 90',
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
  const { data: plot } = usePlot(item.asteroidId, item.plotId);

  const goToAction = usePlotLink({
    asteroidId: item.asteroidId,
    plotId: item.plotId,
    resourceId: item.resourceId,
  });

  const onClick = useCallback(() => {
    if (item.asteroidId) {
      goToAction();
    }
    
    if (item.onClick) {
      // delay dialog opening based on how far camera needs to fly to get there
      let dialogDelay = 0;
      if (item.asteroidId && (currentAsteroid.origin !== item.asteroidId || currentAsteroid.zoomStatus !== 'in')) {
        dialogDelay = 3250;
        if (item.plotId) dialogDelay += 750;
      } else if (item.plotId && currentAsteroid.plot?.plotId !== item.plotId) {
        dialogDelay = 400;
      }
      setTimeout(() => {
        item.onClick({
          openDialog: (dialog, vars) => dispatchActionDialog(dialog, { asteroidId: item.asteroidId, plotId: item.plotId, ...vars }),
          history,
          asteroid,
          plot
        });
      }, dialogDelay)
    }
  }, [
    goToAction,
    currentAsteroid?.origin,
    currentAsteroid?.plot?.plotId,
    currentAsteroid?.zoomStatus,
    item.asteroidId,
    item.plotId,
    item.onClick
  ]);

  const onDismiss = useCallback((e) => {
    e.stopPropagation();
    dismissFailedTx(item.key);
    return false;
  }, [item]);

  return (
    <ActionItemRow
      color={itemColors[type]}
      onClick={onClick}
      oneRow={type !== 'failed' && !asteroid}
      transitionOut={data.transitionOut ? (type === 'failed' ? 'left' : 'right') : undefined}>
      <Icon>
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
          {type === 'unready' && item.completionTime && <>in <LiveTimer target={item.completionTime} maxPrecision={2} /></>}
          {/* TODO: would be nice for this to have different level warning intensity based on time-left and/or presence of inventory on the lot */}
          {type === 'plans' && item.completionTime && <Warning>expires <LiveTimer target={item.completionTime} maxPrecision={2} /></Warning>}
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
    unreadyItems: allUnreadyItems,
  } = useActionItems() || {};

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
              && tx.vars.plotId === item.event.returnValues?.lotId
            ));
          case 'Dispatcher_ConstructionStart':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_CONSTRUCTION'
              && tx.vars.asteroidId === item.assets.asteroid.i
              && tx.vars.plotId === item.assets.lot.i
            ));
          case 'Dispatcher_ExtractionStart':
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_EXTRACTION'
              && tx.vars.asteroidId === item.assets.asteroid.i
              && tx.vars.plotId === item.assets.lot.i
            ));
          case 'Dispatcher_InventoryTransferStart': // TODO: review this
            return !pendingTransactions.find((tx) => (
              tx.key === 'FINISH_DELIVERY'
              && tx.vars.asteroidId === item.assets.asteroid.i
              && tx.vars.plotId === item.assets.lot.i
              && tx.vars.deliveryId === item.assets.deliveryId
            ));
        }
      }
      return true;
    });
  }, [pendingTransactions, allReadyItems]);

  const unreadyItems = useMemo(() => {
    return allUnreadyItems.filter((item) => {
      if (pendingTransactions && item.__t === 'plans') {
        return !pendingTransactions.find((tx) => (
          ['START_CONSTRUCTION', 'UNPLAN_CONSTRUCTION'].includes(tx.key)
          && tx.vars.asteroidId === item.asteroid
          && tx.vars.plotId === item.i
        ));
      }
      return true;
    });
  }, [pendingTransactions, allUnreadyItems]);

  const allItems = useMemo(() => {
    return [
      ...(pendingTransactions || []).map((item) => ({ ...item, type: 'pending' })),
      ...(failedTransactions || []).map((item) => ({ ...item, type: 'failed' })),
      ...(readyItems || []).map((item) => ({ ...item, type: 'ready' })),
      ...(unreadyItems || []).map((item) => {
        if (item.__t === 'plans') return { ...item, key: `plans_${item.gracePeriodEnd}`, type: 'plans' };
        return { ...item, type: 'unready' };
      }),
    ];
  }, [pendingTransactions, failedTransactions, readyItems, unreadyItems])

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

  {/* TODO: collapsible */}
  {/* TODO: the whole left side of the hud should potentially be in the same container so less absolute positioning */}
  return (
    <ActionItemContainer>
      {(displayItems || []).map(({ transition, type, ...item }) => (
        <ActionItem key={`${type}_${item.key}`} data={item} type={type} />
      ))}
    </ActionItemContainer>
  );
};

export default ActionItems;