import { useContext, useCallback, useEffect } from 'react';
import { Switch, Route, NavLink as Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ButtonPill from '~/components/ButtonPill';
import Time from '~/components/Time';
import Account from './launcher/Account';
import Settings from './launcher/Settings';
import Wallets from './launcher/Wallets';
import InfluenceLogo from '~/assets/images/logo.svg';

const headerFooterHeight = 100;

const StyledLauncher = styled.div`
  align-items: center;
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  opacity: 1;
  padding: ${headerFooterHeight}px 0;
  position: absolute;
  width: 100%;
  z-index: 9000;
`;

const Header = styled.ul`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  height: ${headerFooterHeight}px;
  justify-content: center;
  left: 0;
  margin: 0;
  padding: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

const StyledLogo = styled(InfluenceLogo)`
  left: 25px;
  height: ${headerFooterHeight - 50}px;
  position: absolute;
  top: 25px;
`;

const StyledLink = styled(Link)`
  align-items: flex-end;
  color: inherit;
  display: flex;
  height: 100%;
  justify-content: center;
  padding-bottom: 12px;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  width: 100%;
`;

const MenuItem = styled.li`
  color: ${p => p.theme.colors.secondaryText};
  list-style-type: none;
  position: relative;

  & ${StyledLink} {
    transition: all 0.15s ease;
    width: 165px;

    &:after {
      background-clip: padding-box;
      background-color: ${p => p.theme.colors.main};
      border: 2px solid rgba(${p => p.theme.colors.mainRGB}, 0.5);
      bottom: -5.5px;
      content: "";
      height: 6px;
      margin-left -8.4px;
      opacity: 0;
      position: absolute;
      transform: translateX(50%) rotate(45deg);
      transition: opacity 0.15s ease;
      width: 6px;
    }

    &:hover:after, &.current:after {
      opacity: 1;
      transition: opacity 0.3s ease;
    }

    &:hover, &.current {
      color: ${p => p.theme.colors.mainText};
      font-size: 20px;
      transition: all 0.3s ease;
    }
  }
`;

const LogoutButton = styled(ButtonPill)``;

const AccountName = styled.span`
  color: white;
  font-weight: bold;
  padding: 2px 6px;

  &:before {
    content: "${p => p.account.substr(0, 6)}"
  }
  &:after {
    content: "...${p => p.account.substr(-4)}"
  }
`;

const WalletLogo = styled.div`
  background-color: ${p => p.theme.colors.contentDark};
  border-radius: 50%;
  height: 35px;
  margin-right: 5px;
  padding: 7px;
  width: 35px;

  & img {
    height: 100%;
    object-fit: contain;
    width: 100%;
  }
`;

const CurrentAccount = styled.div`
  align-items: center;
  display: flex;
  height: ${headerFooterHeight}px;
  justify-content: flex-end;
  position: absolute;
  right: 40px;
  top: 0;
  width: 200px;

  & ${LogoutButton} {
    display: none;
  }

  &:hover ${LogoutButton} {
    display: block;
  }

  &:hover ${WalletLogo}, &:hover ${AccountName} {
    display: none;
  }
`;

const MainContent = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  margin-top: 50px;
  overflow-y: scroll;
`;

const StyledTime = styled(Time)`
  margin: 20px 0;
`;

const Footer = styled.div`
  background-color: black;
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  bottom: 0;
  display: flex;
  height: ${headerFooterHeight}px;
  justify-content: center;
  left: 0;
  position: absolute;
  right: 0;
`;

const Diamond = styled.div`
  align-items: center;
  background-color: black;
  border: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  height: 25px;
  justify-content: center;
  position: absolute;
  transform: translateY(-50%) rotate(45deg);
  width: 25px;

  & div {
    background-color: ${p => p.theme.colors.main};
    height: 9px;
    width: 9px;
  }
`;

const InfoBar = styled.ul`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 0;

  & a {
    border-right: 1px solid ${p => p.theme.colors.mainBorder};
    color: ${p => p.theme.colors.secondaryText};
    font-size: 14px;
    padding: 5px 20px;
  }

  & a:hover {
    color: ${p => p.theme.colors.mainText};
    text-decoration: none;
  }

  & a:last-child {
    border: 0;
  }
`;

const Launcher = (props) => {
  const location = useLocation();
  const { displayTime } = useContext(ClockContext);
  const invalidateToken = useStore(s => s.dispatchTokenInvalidated);
  const forgetWallet = useStore(s => s.dispatchWalletDisconnected);
  const hideInterface = useStore(s => s.dispatchHideInterface);
  const showInterface = useStore(s => s.dispatchShowInterface);
  const { wallet, logout, token } = useAuth();
  const { account, walletIcon, walletName } = wallet;
  const loggedIn = account && token;

  useEffect(() => {
    hideInterface();
    return () => showInterface();
  }, []);

  return (
    <StyledLauncher {...props}>
      <Header>
        <StyledLogo />
        <MenuItem>
          <StyledLink activeClassName="current" to="/launcher/account">
            <span>{location.pathname === '/launcher/account' ? "Account" : "‹ Back"}</span>
          </StyledLink>
        </MenuItem>
        <MenuItem>
          <StyledLink activeClassName="current" to="/launcher/settings">
            <span>Settings</span>
          </StyledLink>
        </MenuItem>
        {loggedIn &&
          <CurrentAccount onClick={logout}>
            <WalletLogo>{walletIcon}</WalletLogo>
            <AccountName account={account} wallet={walletName} />
            <LogoutButton size='large'>Logout</LogoutButton>
          </CurrentAccount>
        }
      </Header>
      <MainContent>
        <Switch>
          <Route path="/launcher/account"><Account /></Route>
          <Route path="/launcher/wallets"><Wallets /></Route>
          <Route path="/launcher/settings"><Settings /></Route>
        </Switch>
      </MainContent>
      <StyledTime displayTime={displayTime} />
      <Footer>
        <Diamond><div /></Diamond>
        <InfoBar>
          <a href="https://influenceth.io" target="_blank" rel="noopener noreferrer">About</a>
          {process.env.REACT_APP_BRIDGE_URL &&
            <a href={process.env.REACT_APP_BRIDGE_URL} target="_blank" rel="noopener noreferrer">Bridge</a>
          }
          <a href="https://discord.gg/influenceth" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://wiki.influenceth.io" target="_blank" rel="noopener noreferrer">Wiki</a>
        </InfoBar>
      </Footer>
    </StyledLauncher>
  );
};

export default Launcher;
