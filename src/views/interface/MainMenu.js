import styled from 'styled-components';
import { color } from 'styled-system';

import Menu from './mainMenu/Menu';
import MenuItem from './mainMenu/MenuItem';
import Logo from './mainMenu/menu-logo.svg';
import { FaEthereum } from 'react-icons/fa';
import { MdSettings } from 'react-icons/md';
import { GiArchBridge} from 'react-icons/gi';
import { RiHistoryFill } from 'react-icons/ri';
import { AiFillStar } from 'react-icons/ai';
import { HiCollection } from 'react-icons/hi';
import { GiMoonOrbit } from 'react-icons/gi';
import { BiListCheck } from 'react-icons/bi';

const Wrapper = styled.div`
  bottom: 0;
  box-sizing: border-box;
  padding: 25px 0 25px 25px;
  pointer-events: auto;
  position: absolute;
  width: 100%;
`;

const StyledLogo = styled.img`
  bottom: 25px;
  height: 40px;
  position: absolute;
`;

const MenuWrapper = styled.div`
  align-items: flex-end;
  display: flex;
  margin-left: 98px;
`;

const MenuFiller = styled.div`
  border-bottom: 4px solid rgb(255, 255, 255, 0.25);
  flex: 1 0 auto;
`;

const MainMenu = (props) => {
  return (
    <Wrapper>
      <StyledLogo src={Logo} />
      <MenuWrapper>
        <Menu title="Map">
          <MenuItem name="Assets" icon={<HiCollection />} />
          <MenuItem name="Planning" icon={<GiMoonOrbit />} />
          <MenuItem name="Watchlist" icon={<BiListCheck />} />
        </Menu>
        <Menu title="Account">
          <MenuItem name="Wallet" icon={<FaEthereum />} />
          <MenuItem name="Bridge" icon={<GiArchBridge />} />
          <MenuItem name="Settings" icon={<MdSettings />} />
        </Menu>
        <Menu title="Profile">
          <MenuItem name="History" icon={<RiHistoryFill />} />
          <MenuItem name="Rewards" icon={<AiFillStar />} />
        </Menu>
        <MenuFiller />
      </MenuWrapper>
    </Wrapper>
  );
};

export default MainMenu;
