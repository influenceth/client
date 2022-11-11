import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { MdWorkspacesOutline as ResourcesIcon } from 'react-icons/md';

import IconButton from '~/components/IconButton';
import {
  LayBlueprintIcon as BuildingsIcon,
  CloseIcon,
  CrewIcon,
  EyeIcon,
  FilterIcon,
  MapIcon,
  MenuIcon,
  RocketIcon,
  RouteIcon,
  StarIcon,
  TimeIcon
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Time from './mainMenu/Time';
import Logo from './mainMenu/menu-logo.svg';
import LogoLong from '~/assets/images/logo.svg';

const StyledMainMenu = styled.div`
  align-items: flex-end;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  flex: 0 1 auto;
  height: 75px;
  padding: 25px 0 25px 25px;
  pointer-events: auto;
  position: relative;
  width: 100%;
  z-index: 3;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: black;
    height: ${p => p.showMenu ? '100%' : '50px'};
    padding: 10px;
    position: absolute;
    transition: all 0.3s ease;
    width: ${p => p.showMenu ? '100%' : '50px'};
    z-index: 1;
  }
`;

const Background = styled.div`
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0),
    ${p => p.theme.colors.contentBackdrop} 50%,
    ${p => p.theme.colors.contentBackdrop}
  );
  backdrop-filter: blur(4px);
  bottom: 0;
  left: 0;
  right: 0;
  height: 25px;
  position: absolute;
`;

const StyledLogo = styled(Logo)`
  bottom: 25px;
  height: 40px;
  position: absolute;
  width: auto;
`;

const StyledLogoLong = styled(LogoLong)`
  height: 40px;
  min-width: 100%;
  padding-right: 20px;
  position: absolute;
  top: 15px;
`;

const MenuWrapper = styled.div`
  align-items: flex-end;
  display: flex;
  flex: 1 0 auto;
  margin-left: 98px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: ${p => p.showMenu ? 'block': 'none'};
    flex-direction: column;
    height: 100%;
    margin: 0;
    padding-top: 60px;
    width: 100%;
  }
`;

const MenuFiller = styled.div`
  border-bottom: 4px solid ${p => p.theme.colors.mainBorder};
  flex: 1 0 auto;
`;

const EndMenuFiller = styled(MenuFiller)`
  flex: 0 0 auto;
  width: 10px;
`;

const MenuControl = styled(IconButton)`
  position: absolute;
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
  const { data: crew } = useOwnedCrew();
  const hasGenesisCrewmate = useMemo(() => {
    return crew && !!crew.find((c) => [1,2,3].includes(c.crewCollection))
  }, [crew?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^^^

  const [ showMenu, setShowMenu ] = useState(!isMobile);

  const openSection = (section) => {
    activateSection(section);
    playSound('effects.click');
    if (isMobile) setShowMenu(false);
  };

  return (
    <StyledMainMenu showMenu={showMenu}>
      {!isMobile && (
        <>
          <StyledLogo />
          <Background />
        </>
      )}
      {isMobile && (
        <MenuControl
          onClick={() => setShowMenu(!showMenu)}
          borderless>
          {!showMenu ? <MenuIcon /> : <CloseIcon />}
        </MenuControl>
      )}
      <MenuWrapper showMenu={showMenu}>
        {isMobile && <StyledLogoLong />}
        {!!account && (
          <Menu title="Account">
            <MenuItem
              name="Watchlist"
              icon={<EyeIcon />}
              onClick={() => openSection('watchlist')} />
          </Menu>
        )}
        {!!account && (
          <Menu title="Assets">
            <MenuItem
              name="Asteroids"
              icon={<StarIcon />}
              onClick={() => openSection('ownedAsteroids')} />
            <MenuItem
              name="Crew Members"
              icon={<CrewIcon />}
              onClick={() => openSection('ownedCrew')} />
          </Menu>
        )}
        <Menu title="Map">
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
        {!isMobile && (
          <>
            <MenuFiller />
            <Time onClick={() => openSection('timeControl')} />
            <EndMenuFiller />
          </>
        )}
      </MenuWrapper>
    </StyledMainMenu>
  );
};

export default MainMenu;
