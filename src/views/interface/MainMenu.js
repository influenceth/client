import styled from 'styled-components';

import useSettingsStore from '~/hooks/useSettingsStore';
import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Time from './mainMenu/Time';
import Logo from './mainMenu/menu-logo.svg';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { AiFillStar, AiFillEye } from 'react-icons/ai';
import { RiRouteFill } from 'react-icons/ri';

const StyledMainMenu = styled.div`
  align-items: flex-end;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  padding: 25px 0 25px 25px;
  pointer-events: auto;
  position: absolute;
  width: 100%;
`;

const Background = styled.div`
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0),
    ${props => props.theme.colors.contentBackdrop} 50%,
    ${props => props.theme.colors.contentBackdrop}
  );
  backdrop-filter: blur(4px);
  bottom: 0;
  left: 0;
  right: 0;
  height: 25px;
  position: absolute;
`;

const StyledLogo = styled.img`
  bottom: 25px;
  height: 40px;
  position: absolute;
`;

const MenuWrapper = styled.div`
  align-items: flex-end;
  display: flex;
  flex: 1 0 auto;
  margin-left: 98px;
`;

const MenuFiller = styled.div`
  border-bottom: 4px solid ${props => props.theme.colors.mainBorder};
  flex: 1 0 auto;
`;

const EndMenuFiller = styled(MenuFiller)`
  flex: 0 0 auto;
  width: 10px;
`;

const MainMenu = (props) => {
  const setOutlinerSectionVisible = useSettingsStore(state => state.setOutlinerSectionVisible);

  return (
    <StyledMainMenu>
      <StyledLogo src={Logo} />
      <Background />
      <MenuWrapper>
        <Menu title="Account">
          <MenuItem
            name="Wallet"
            icon={<MdAccountBalanceWallet />}
            onClick={() => setOutlinerSectionVisible('wallet')} />
          <MenuItem
            name="Watchlist"
            icon={<AiFillEye />}
            onClick={() => setOutlinerSectionVisible('watchlist')} />
        </Menu>
        <Menu title="Assets">
          <MenuItem
            name="Asteroids"
            icon={<AiFillStar />}
            onClick={() => setOutlinerSectionVisible('ownedAsteroids')} />
        </Menu>
        <Menu title="Map">
          <MenuItem
            name="Route Planner"
            icon={<RiRouteFill />}
            onClick={() => setOutlinerSectionVisible('routePlanner')} />
        </Menu>
        <MenuFiller />
        <Time onClick={() => setOutlinerSectionVisible('timeControl')} />
        <EndMenuFiller />
      </MenuWrapper>
    </StyledMainMenu>
  );
};

export default MainMenu;
