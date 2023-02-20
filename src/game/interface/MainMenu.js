import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { MdFullscreen, MdFullscreenExit, MdWorkspacesOutline as ResourcesIcon } from 'react-icons/md';
import screenfull from 'screenfull';

import IconButton from '~/components/IconButton';
import {
  ConstructIcon as BuildingsIcon,
  CloseIcon,
  CrewIcon,
  EyeIcon,
  FilterIcon,
  MapIcon,
  MenuIcon,
  RocketIcon,
  RouteIcon,
  StarIcon,
  TimeIcon,
  BackIcon
} from '~/components/Icons';
import InfluenceLogo from '~/components/InfluenceLogo';
import useAuth from '~/hooks/useAuth';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Time from './mainMenu/TimeControls';
import Logo from './mainMenu/menu-logo.svg';
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
const centerAreaWidth = 540;
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

  const { account } = useAuth();
  const { data: crewAssignmentData } = useCrewAssignments();
  const { totalAssignments } = crewAssignmentData || {};

  // TODO: genesis book deprecation vvv
  const { crew, crewMemberMap } = useCrew();
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

  return (
    <StyledMainMenu>
      <Actionable>
        <LeftHudButtonArea>
          <HudIconButton
            data-tip="Report a Testnet Bug"
            onClick={() => {}}>
            <BackIcon />
          </HudIconButton>
        </LeftHudButtonArea>

        <MenuWrapper>
          {!!account && (
            <Menu title="Assets">
              <MenuItem
                name="Asteroids"
                icon={<StarIcon />}
                onClick={() => openSection('ownedAsteroids')} />
              <MenuItem
                name="Crew"
                icon={<CrewIcon />}
                onClick={() => history.push('/owned-crew')} />
            </Menu>
          )}
          {!!account && (
            <Menu title="Events">
              <MenuItem
                name="Watchlist"
                icon={<EyeIcon />}
                onClick={() => openSection('watchlist')} />
            </Menu>
          )}
          <Menu title="Finances">
            <MenuItem
              name="Filters"
              icon={<FilterIcon />}
              onClick={() => openSection('filters')} />
            <MenuItem
              name="Mapped Asteroids"
              icon={<MapIcon />}
              onClick={() => openSection('mappedAsteroids')} />
            <MenuItem
              name="Route Planner"
              icon={<RouteIcon />}
              onClick={() => openSection('routePlanner')} />
            <MenuItem
              name="Time Controls"
              icon={<TimeIcon />}
              onClick={() => openSection('timeControl')} />

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
              <MdFullscreen />
            </HudIconButton>
          )}
          {screenfull.isEnabled && fullscreen && !isMobile && (
            <HudIconButton
              data-tip="Exit Fullscreen"
              onClick={() => screenfull.exit()}>
              <MdFullscreenExit />
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
