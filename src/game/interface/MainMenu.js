import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import useStore from '~/hooks/useStore';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Time from './mainMenu/Time';
import Logo from './mainMenu/menu-logo.svg';
import { AiFillStar, AiFillEye } from 'react-icons/ai';
import { RiRouteFill, RiFilter2Fill as FilterIcon, RiTableFill } from 'react-icons/ri';
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
`;

const MenuFiller = styled.div`
  border-bottom: 4px solid ${p => p.theme.colors.mainBorder};
  flex: 1 0 auto;
`;

const EndMenuFiller = styled(MenuFiller)`
  flex: 0 0 auto;
  width: 10px;
`;

const MainMenu = (props) => {
  const dispatchOutlinerSectionActivated = useStore(s => s.dispatchOutlinerSectionActivated);
  const history = useHistory();

  return (
    <StyledMainMenu>
      <StyledLogo />
      <Background />
      <MenuWrapper>
        <Menu title="Account">
          <MenuItem
            name="Watchlist"
            icon={<AiFillEye />}
            onClick={() => dispatchOutlinerSectionActivated('watchlist')} />
        </Menu>
        <Menu title="Assets">
          <MenuItem
            name="Asteroids"
            icon={<AiFillStar />}
            onClick={() => dispatchOutlinerSectionActivated('ownedAsteroids')} />
          <MenuItem
            name="Crew Members"
            icon={<CrewIcon />}
            onClick={() => dispatchOutlinerSectionActivated('ownedCrew')} />
        </Menu>
        <Menu title="Map">
          <MenuItem
            name="Filters"
            icon={<FilterIcon />}
            onClick={() => dispatchOutlinerSectionActivated('filters')} />
          <MenuItem
            name="Filtered Asteroids"
            icon={<RiTableFill />}
            onClick={() => history.push('/asteroids')} />
          <MenuItem
            name="Route Planner"
            icon={<RiRouteFill />}
            onClick={() => dispatchOutlinerSectionActivated('routePlanner')} />
        </Menu>
        <MenuFiller />
        <Time onClick={() => dispatchOutlinerSectionActivated('timeControl')} />
        <EndMenuFiller />
      </MenuWrapper>
    </StyledMainMenu>
  );
};

export default MainMenu;
