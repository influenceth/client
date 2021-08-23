import { useState } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';

import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import IconButton from '~/components/IconButton';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Time from './mainMenu/Time';
import Logo from './mainMenu/menu-logo.svg';
import { AiFillStar, AiFillEye } from 'react-icons/ai';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { FiMenu } from 'react-icons/fi';
import { MdClose } from 'react-icons/md';
import { RiRouteFill, RiFilter2Fill as FilterIcon } from 'react-icons/ri';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';

const StyledMainMenu = styled.div`
  align-items: flex-end;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  flex: 0 1 auto;
  height: 94px;
  padding: 25px 0 25px 25px;
  pointer-events: auto;
  position: relative;
  width: 100%;

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
  const { account } = useWeb3React();
  const { isMobile } = useScreenSize();
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
          {!showMenu ? <FiMenu /> : <MdClose />}
        </MenuControl>
      )}
      <MenuWrapper showMenu={showMenu}>
        {!!account && (
          <Menu title="Account">
            <MenuItem
              name="Watchlist"
              icon={<AiFillEye />}
              onClick={() => openSection('watchlist')} />
          </Menu>
        )}
        {!!account && (
          <Menu title="Assets">
            <MenuItem
              name="Asteroids"
              icon={<AiFillStar />}
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
            icon={<FaMapMarkedAlt />}
            onClick={() => openSection('mappedAsteroids')} />
          <MenuItem
            name="Route Planner"
            icon={<RiRouteFill />}
            onClick={() => openSection('routePlanner')} />
        </Menu>
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
