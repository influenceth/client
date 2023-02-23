import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import {
  MdFullscreen as FullscreenIcon,
  MdFullscreenExit as ExitFullscreenIcon } from 'react-icons/md';
import screenfull from 'screenfull';

import {
  ConstructIcon as BuildingsIcon,
  CrewIcon,
  EyeIcon,
  RocketIcon,
  RouteIcon,
  BackIcon,
  CoreSampleIcon,
  FavoriteIcon,
  ResourceIcon,
  CrewStoryIcon,
  LeaseIcon,
  OrderIcon,
  WalletIcon,
  RadiusIcon
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import HudIconButton from '~/components/HudIconButton';
import TimeControls from './mainMenu/TimeControls';

const StyledMainMenu = styled.div`
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
`;

const Actionable = styled.div`
  & > * {
    pointer-events: all;
  }
`;

const barHeight = 50;
const centerAreaWidth = 560;
const centerAreaHalfWidth = centerAreaWidth / 2;
const cornerButtonWidth = 40;
const dipAmount = 15;
const transitionWidth = dipAmount;
const secondDipMult = 0.6;
const minWidth = 2 * (centerAreaHalfWidth + cornerButtonWidth + 2 * transitionWidth);
const BottomBar = styled.div`
  background: black;
  height: ${barHeight}px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;

  @media (min-width: ${minWidth}px) {
    clip-path: polygon(
      0% 100%,
      0% 0%,
      ${cornerButtonWidth}px 0%,
      ${cornerButtonWidth + transitionWidth}px ${dipAmount}px,
      calc(50% - ${centerAreaHalfWidth + transitionWidth * secondDipMult}px) ${dipAmount}px,
      calc(50% - ${centerAreaHalfWidth}px) ${(1 + secondDipMult) * dipAmount}px,
      calc(50% + ${centerAreaHalfWidth}px) ${(1 + secondDipMult) * dipAmount}px,
      calc(50% + ${centerAreaHalfWidth + transitionWidth * secondDipMult}px) ${dipAmount}px,
      calc(100% - ${cornerButtonWidth + transitionWidth}px) ${dipAmount}px,
      calc(100% - ${cornerButtonWidth}px) 0%,
      100% 0%,
      100% 100%
    );
  }
`;
const BottomBarBackground = styled(BottomBar)`
  background: #444;
  bottom: 1px;
`;

const HudButtonArea = styled.div`
  position: absolute;
  bottom: 4px;
  z-index: 4;
`;
const LeftHudButtonArea = styled(HudButtonArea)`
  left: 4px;
`;
const RightHudButtonArea = styled(HudButtonArea)`
  right: 4px;
`;

const TimeSection = styled.div`
  position: absolute;
  right: ${cornerButtonWidth + transitionWidth}px;
  bottom: ${barHeight - dipAmount}px;
`;

const MenuWrapper = styled.div`
  display: flex;
  flex-direction: row;

  align-items: flex-end;
  justify-content: space-around;

  position: absolute;
  left: 50%;
  bottom: ${barHeight - 1.5 * dipAmount}px;
  margin-left: -${centerAreaHalfWidth}px;
  width: ${centerAreaWidth}px;

  z-index: 4;
`;

const MainMenu = (props) => {
  const activateSection = useStore(s => s.dispatchOutlinerSectionActivated);
  const playSound = useStore(s => s.dispatchSoundRequested);
  const { isMobile } = useScreenSize();
  const history = useHistory();

  const { plotId } = useStore(s => s.asteroids.plot) || {};
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const dispatchZoomToPlot = useStore(s => s.dispatchZoomToPlot);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const { account } = useAuth();
  const { data: crewAssignmentData } = useCrewAssignments();
  const { totalAssignments } = crewAssignmentData || {};

  // TODO: genesis book deprecation vvv
  const { crew, crewMemberMap } = useCrewContext();
  const hasGenesisCrewmate = useMemo(() => {
    return crew && crew?.crewMembers && crewMemberMap && crew.crewMembers.find((i) => [1,2,3].includes(crewMemberMap[i]?.crewCollection));
  }, [crew?.crewMembers, crewMemberMap]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^^^

  const [ showMenu, setShowMenu ] = useState(!isMobile);

  const openSection = (section) => {
    activateSection(section);
    playSound('effects.click');
    if (isMobile) setShowMenu(false);
  };

  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
      });
    }
  }, []);

  const { backLabel, onClickBack } = useMemo(() => {
    if (zoomStatus !== 'in') return {};
    if (zoomToPlot) {
      return {
        backLabel: 'Back to Asteroid',
        onClickBack: () => dispatchZoomToPlot()
      }
    }
    if (plotId) {
      return {
        backLabel: 'Deselect Lot',
        onClickBack: () => dispatchPlotSelected()
      }
    }
    return {
      backLabel: 'Back to Belt',
      onClickBack: () => updateZoomStatus('zooming-out')
    }
  }, [plotId, zoomToPlot, zoomStatus]);

  const notYet = () => {
    createAlert({
      type: 'GenericAlert',
      level: 'warning',
      content: 'Not yet.',
      duration: 1000
    });
  }

  return (
    <StyledMainMenu>
      <Actionable>
        <LeftHudButtonArea>
          {onClickBack
            ? (
              <HudIconButton
                data-tip={backLabel}
                onClick={onClickBack}>
                <BackIcon />
              </HudIconButton>
            )
            : (
              <img
                src={`${process.env.PUBLIC_URL}/maskable-logo-48x48.png`}
                style={{ height: 38, marginLeft: 3 }} />
            )
          }
        </LeftHudButtonArea>

        <MenuWrapper>
          {!!account && (
            <Menu title="Assets">
              <MenuItem
                name="My Asteroids"
                icon={<RadiusIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Crew"
                icon={<CrewIcon />}
                onClick={() => history.push('/owned-crew')} />
              <MenuItem
                name="My Ships"
                icon={<RocketIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Buildings"
                icon={<BuildingsIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Resources"
                icon={<ResourceIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Core Samples"
                icon={<CoreSampleIcon />}
                onClick={notYet} />
              <MenuItem
                name="Favorites"
                icon={<FavoriteIcon />}
                onClick={() => openSection('belt.Favorites')} />
            </Menu>
          )}
          {!!account && (
            <Menu title="Events">
              <MenuItem
                name="Captain's Log"
                icon={<EyeIcon />}
                onClick={notYet} />
              <MenuItem
                name="Trips"
                icon={<RouteIcon />}
                onClick={notYet} />
              <MenuItem
                name="Crew Stories"
                icon={<CrewStoryIcon />}
                onClick={notYet} />
            </Menu>
          )}
          <Menu title="Finances">
            <MenuItem
              name="Transactions"
              icon={<WalletIcon />}
              onClick={notYet} />
            <MenuItem
              name="Market Orders"
              icon={<OrderIcon />}
              onClick={notYet} />
            <MenuItem
              name="Leases"
              icon={<LeaseIcon />}
              onClick={notYet} />

          </Menu>
          
          {/*
          <Menu title="Viewer">
            <MenuItem
              name="Buildings"
              icon={<BuildingsIcon />}
              onClick={() => history.push('/building-viewer')} />
            <MenuItem
              name="Resources"
              icon={<ResourcesIcon />}
              onClick={() => history.push('/resource-viewer')} />
          </Menu>

          {!!account && hasGenesisCrewmate && (
            <Menu title="Activities" badge={totalAssignments}>
              <MenuItem
                name="Crew Assignments"
                icon={<RocketIcon />}
                onClick={() => openSection('crewAssignments')} />
            </Menu>
          )}
          */}
        </MenuWrapper>

        {!isMobile && (
          <TimeSection>
            <TimeControls />
          </TimeSection>
        )}

        <RightHudButtonArea>
          {screenfull.isEnabled && !fullscreen && !isMobile && (
            <HudIconButton
              data-tip="Go Fullscreen"
              onClick={() => screenfull.request()}>
              <FullscreenIcon />
            </HudIconButton>
          )}
          {screenfull.isEnabled && fullscreen && !isMobile && (
            <HudIconButton
              data-tip="Exit Fullscreen"
              onClick={() => screenfull.exit()}>
              <ExitFullscreenIcon />
            </HudIconButton>
          )}
        </RightHudButtonArea>
      </Actionable>
      
      <BottomBarBackground />
      <BottomBar />
    </StyledMainMenu>
  );
};

export default MainMenu;
