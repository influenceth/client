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
  align-items: flex-end;
  box-sizing: border-box;
  display: flex;
  flex: 1 0 auto;
  padding: 25px 0 25px 25px;
  pointer-events: auto;
  position: relative;
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

const CornerBackground = styled.div`
  background: ${props => props.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  bottom: 25px;
  clip-path: polygon(0 100%, 100% 100%, 100% 0);
  right: 0;
  position: absolute;
  height: 25px;
  width: 25px;
`;

const CornerBorder = styled.svg`
  fill: ${props => props.theme.colors.mainBorder};
  bottom: 25px;
  right: 0;
  position: absolute;
  height: 25px;
  width: 25px;
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
  margin-right: 25px;
`;

const MainMenu = (props) => {
  return (
    <Wrapper>
      <StyledLogo src={Logo} />
      <Background />
      <CornerBackground />
      <CornerBorder viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
        <polygon points="0,25 0,21 21,0 25, 0" />
      </CornerBorder>
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
