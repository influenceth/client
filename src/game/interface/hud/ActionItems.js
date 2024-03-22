import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import BarLoader from 'react-spinners/BarLoader';

import { CloseIcon as DismissIcon, PopoutIcon } from '~/components/Icons';
import { FailedIcon, RandomEventIcon, ReadyIcon } from '~/components/AnimatedIcons';
import CollapsibleSection from '~/components/CollapsibleSection';
import LiveTimer from '~/components/LiveTimer';
import { useLotLink } from '~/components/LotLink';
import useActionItems from '~/hooks/useActionItems';
import useAsteroid from '~/hooks/useAsteroid';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatActionItem, itemColors, statuses } from '~/lib/actionItem';
import { hexToRGB } from '~/theme';
import formatters from '~/lib/formatters';

const ICON_WIDTH = 34;
const ITEM_WIDTH = 410;
const SECTION_WIDTH = 450;
const TRANSITION_TIME = 400;

const TitleWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;

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
  & > a {
    color: ${p => p.theme.colors.main} !important;
    &:hover {
      color: white !important;
    }
    transition: color 250ms ease;
  }
`;

const OuterWrapper = styled.div`
  flex: 1;
  height: 0;
  pointer-events: none;
  position: relative;
  width: 100%;
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
const Label = styled.div`
  white-space: nowrap;
`;
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
  width: 80px;
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
    font-size: ${ICON_WIDTH}px;
    height: ${ICON_WIDTH}px;
    justify-content: center;
    margin-right: 8px;
    width: ${ICON_WIDTH}px;
    & span {
      font-size: 24px;
      line-height: 0;
    }
  }
  ${Status} {
    margin-right: 8px;
    text-transform: uppercase;
  }
  ${Label} {
    color: white;
    white-space: nowrap;
  }
  ${Details} {
    flex: 1;
    height: 100%;
    margin-right: 8px;
    overflow: hidden;
    & > * {
      align-items: center;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      height: 100%;
      justify-content: flex-end;
      transition: transform 150ms ease;
      white-space: nowrap;
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

const ActionItem = ({ data, getActivityConfig }) => {
  const history = useHistory();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const currentAsteroidId = useStore(s => s.asteroids.origin);
  const currentLotId = useStore(s => s.asteroids.lot);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const dispatchActionDialog = useStore(s => s.dispatchActionDialog);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dismissFailedTx = useStore(s => s.dispatchFailedTransactionDismissed);
  const type = data?.type;

  // TODO: can probably clean up the `formatted` structure
  const item = useMemo(() => {
    return formatActionItem(
      data,
      !['randomEvent', 'plans', 'pending'].includes(data.type) ? getActivityConfig(data)?.actionItem : {}
    );
  }, [data, getActivityConfig]);

  const { data: asteroid } = useAsteroid(item.asteroidId);
  const { data: lot } = useLot(item.lotId);

  const goToAction = useLotLink({
    asteroidId: item.asteroidId,
    lotId: item.lotId,
    resourceId: resourceMap?.active ? item.resourceId : undefined,  // only open resourcemap if a resourcemap is open
  });

  const onClick = useCallback(() => {
    if (item.asteroidId) {
      goToAction();
    }

    if (item.onClick) {
      // delay dialog opening based on how far camera needs to fly to get there
      let dialogDelay = 0;
      if (item.asteroidId && (currentAsteroidId !== item.asteroidId || zoomStatus !== 'in')) {
        dialogDelay = 3250;
        if (item.lotId) dialogDelay += 750;
      } else if (item.lotId && currentLotId !== item.lotId) {
        dialogDelay = 400;
      // TODO: implement these?
      } else if (item.buildingId) {
      } else if (item.shipId) {
      }
      setTimeout(() => {
        item.onClick({
          openDialog: (dialog, vars) => dispatchActionDialog(dialog, { asteroidId: item.asteroidId, lotId: item.lotId, ...vars }),
          openLauncher: (launcherPage) => dispatchLauncherPage(launcherPage),
          history,
          asteroid,
          lot
        });
      }, dialogDelay)
    }

    if (type === 'failed' && item.txHash && process.env.REACT_APP_STARKNET_EXPLORER_URL) {
      try {
        navigator.clipboard.writeText(JSON.stringify(data));
        createAlert({
          type: 'ClipboardAlert',
          data: { content: 'Transaction error copied to clipboard. If you are stuck, contact the Influence team in Discord.' }
        });
      } catch (e) {}

      window.open(`${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${item.txHash}`, '_blank');
    }
  }, [
    goToAction,
    currentAsteroidId,
    currentLotId,
    item.asteroidId,
    item.lotId,
    item.onClick,
    zoomStatus,
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
        {type === 'failed' && <FailedIcon />}
        {type === 'randomEvent' && <RandomEventIcon size="0.77em" />}
        {type === 'ready' && <ReadyIcon />}
        {(type === 'pending' || type === 'unready' || type === 'plans') && <span>{item.icon}</span>}
      </Icon>
      <Status>{statuses[type]}</Status>
      <Label>{item.label}</Label>
      <Details>
        <Timing>
          {type === 'pending' && 'Just Now'}
          {(type === 'ready' || type === 'failed' || type === 'randomEvent') && item.ago}
          {type === 'unready' && item.finishTime && <LiveTimer target={item.finishTime} maxPrecision={2} prefix="in " />}
          {/* TODO: would be nice for this to have different level warning intensity based on time-left and/or presence of inventory on the lot */}
          {type === 'plans' && (
            item.finishTime
              ? <LiveTimer target={item.finishTime} maxPrecision={2} prefix="remaining " />
              : <b>at risk</b>
          )}
        </Timing>
        {type === 'failed' && (
          <div>
            <Dismissal onClick={onDismiss}>
              Dismiss <div><DismissIcon /></div>
            </Dismissal>
          </div>
        )}
        {type !== 'failed' && asteroid && (
          <Location>
            {item.locationDetail && <><b>{item.locationDetail}</b></>}
            <span>{formatters.asteroidName(asteroid)}</span>
            {/* TODO: use <EntityName /> instead? */}
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
  const { authenticated } = useSession();
  const { allVisibleItems: allItems } = useActionItems();
  const { captain, crew } = useCrewContext();
  const getActivityConfig = useGetActivityConfig();

  const [displayItems, setDisplayItems] = useState();
  useEffect(() => {
    if (displayItems) {
      // TODO: maybe this should show new ones while transitioning out old ones?
      // set to transition state
      setDisplayItems((items) => {
        items.forEach((item) => {
          if (!allItems.find((i) => i.uniqueKey === item.uniqueKey)) {
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

  if (!captain) return null;
  return (
    <OuterWrapper>
      {authenticated && (
        <CollapsibleSection
          borderless
          collapsibleProps={{ style: { width: SECTION_WIDTH - 32 } }}
          openOnChange={lastClick}
          title={(
            <TitleWrapper>
              <Filters>
                <ReadyFilter tally={tallies.ready} onClick={onClickFilter('ready')} selected={selectedFilter === 'ready'} />
                <InProgressFilter tally={tallies.progress} onClick={onClickFilter('progress')} selected={selectedFilter === 'progress'} />
                <LinkContainer style={{ flex: 1, textAlign: 'left' }}>
                  <Link to="/listview/actionitems" onClick={(e) => e.stopPropagation()}>
                    <PopoutIcon />
                  </Link>
                </LinkContainer>
              </Filters>
            </TitleWrapper>
          )}>
          <ActionItemWrapper>
            <ActionItemContainer>
              {filteredDisplayItems.map((item) => (
                <ActionItem
                  key={item.uniqueKey}
                  data={item}
                  getActivityConfig={getActivityConfig}
                />
              ))}
            </ActionItemContainer>
          </ActionItemWrapper>
        </CollapsibleSection>
      )}
    </OuterWrapper>
  );
};

export default ActionItems;