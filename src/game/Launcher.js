import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { RingLoader as Loader } from 'react-spinners';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import Badge from '~/components/Badge';
import InfluenceLogo from '~/components/InfluenceLogo';
import NavIcon from '~/components/NavIcon';
import {
  ChevronDoubleRightIcon,
  CloseIcon,
  DownloadIcon,
  LogoutIcon,
  MyAssetIcon,
  UserIcon,
  WalletIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import Crews from './launcher/Crews';
import Settings from './launcher/Settings';
import HudMenu from './interface/hud/HudMenu';
import Store from './launcher/Store';
import usePriceConstants from '~/hooks/usePriceConstants';
import DropdownNavMenu, { NavMenuLoggedInUser } from './interface/hud/DropdownNavMenu';
import { reactBool } from '~/lib/utils';

const menuPadding = 25;
const headerHeight = 68;
const footerHeight = 80;

// TODO: should add in/out transitions to this page
const StyledLauncher = styled.div`
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0.5) 100%);
  backdrop-filter: blur(0.75px) saturate(70%);
  height: 100vh;
  opacity: 1;
  padding: ${headerHeight + menuPadding}px 0 0;
  position: absolute;
  width: 100vw;
  z-index: 8999;
`;

const ContentWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const TopLeftMenu = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  padding: ${menuPadding}px;
`;

const TopRightMenu = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: ${p => p.noPadding ? 0 : menuPadding}px;
`;

const BottomLeftMenu = styled.div`
  position: absolute;
  bottom: ${footerHeight / 4}px;
  left: 0;
  padding: ${menuPadding}px;
`;

const Nav = styled.div`
  margin-top: ${menuPadding}px;
  width: 225px;
`;

const Icon = styled.div``;
const NavItem = styled.div`
  align-items: center;
  color: ${p => p.selected ? 'white' : '#b7b7b7'};
  cursor: ${p => p.selected ? p.theme.cursors.default : p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 17px;
  height: 40px;
  text-transform: uppercase;
  transition: color 250ms ease;

  ${p => p.isRule && `
    height: 24px;
    color: white;
    &:before {
      content: "";
      border-top: 1px solid #444;
      margin-left: 25px;
      width: 100%;
    }
  `}

  &:hover {
    color: white;
  }

  & ${Icon} {
    color: ${p => p.theme.colors.main};
    margin-right: 8px;
    opacity: ${p => p.selected ? 1 : 0};
    transition: opacity 250ms ease;
  }
`;

const LogoWrapper = styled.div`
  height: ${headerHeight}px;

  & > svg {
    height: 100%;
  }

  ${p => p.hideHeader && `
    @media (min-height: ${p.hideHeader}px) {
      display: none;
    }
  `}
`;

const LeftIcon = styled.div`
  align-items: center;
  background: #333;
  border-radius: 100%;
  display: flex;
  font-size: 32px;
  height: 40px;
  justify-content: center;
  position: relative;
  width: 40px;
  ${p => p.connecting
    ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.4);
      color: white;
    `
    : `
      &:after {
        content: "";
        background: ${p.connected ? p.theme.colors.success : p.theme.colors.error};
        position: absolute;
        bottom: 0;
        right: -3px;
        border-radius: 6px;
        height: 12px;
        width: 12px;
      }
    `
  }
  & > img {
    width: 1em;
  }
`;

const RightIcon = styled.div``;
const HoverContent = styled.label`
  display: none;
`;

const AccountButton = styled.div`
  align-items: center;
  background: black;
  border: 1px solid black;
  border-radius: 24px;
  color: #AAA;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  height: 48px;
  padding: 3px 12px 3px 4px;
  width: 280px;
  & label {
    flex: 1;
    font-weight: bold;
    line-height: 0;
    margin-left: 9px;
  }
  transition: background 250ms ease, border-color 250ms ease, color 250ms ease;

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
    border-color: rgba(${p => p.theme.colors.mainRGB}, 0.8);
    color: white;
    ${p => p.hasHoverContent && `
      & label {
        display: none;
      }
      & ${HoverContent} {
        color: ${p.theme.colors.error};
        display: block;
      }
      & ${RightIcon} {
        color: ${p.theme.colors.error};
      }
    `}
  }
`;

const PlayButton = styled.div`
  align-items: center;
  background: black;
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 1);
  border-radius: 50px;
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 26px;
  justify-content: center;
  margin: 40px 0 20px;
  opacity: 1;
  padding: 0.5em;
  position: relative;
  text-transform: uppercase;
  transition: border-color 250ms ease;
  width: 300px;
  z-index: 1;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
    border-radius: 50px;
    position: absolute;
    top: 4px; bottom: 4px; left: 4px; right: 4px;
    transition: background 250ms ease;
    z-index: -1;
  }

  &:hover {
    border-color: rgba(${p => p.theme.colors.mainRGB}, 1);
    &:before {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.5);
    }
  }
`;

const MainContent = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  justify-content: center;
  overflow: auto;
  padding-right: 15px;
`;

const Footer = styled.div`
  align-items: center;
  color: #777;
  display: flex;
  flex-direction: row;
  flex: 0 0 ${footerHeight}px;
  justify-content: center;
  text-align: center;
  width: 100%;

  & > div {
    flex: 1;

    &:first-child,
    &:last-child {
      flex: 0 1 400px;
      text-align: right;
      text-transform: uppercase;
      & > a {
        border-left: 0 !important;
      }
    }

    & > a {
      border-left: 1px solid #777;
      color: inherit;
      display: inline-block;
      line-height: 1.5em;
      padding: 0 20px;
      text-decoration: none;
      transition: color 250ms ease;

      &:first-child {
        border-left: 0;
      }

      &:hover {
        color: #CCC;
      }
    }
  }
`;

const StyledNavIcon = () => <Icon><NavIcon selected selectedColor="#777" /></Icon>;

const Launcher = (props) => {
  const { authenticating, login, logout, token, walletContext } = useAuth();
  const { crews, loading: crewsLoading } = useCrewContext();
  const { data: priceConstants, isLoading: priceConstantsLoading } = usePriceConstants();

  const launcherPage = useStore(s => s.launcherPage);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);

  const [menuOpen, setMenuOpen] = useState(false);

  const { account } = walletContext;
  const walletId = walletContext?.starknet?.id;

  const loggedIn = account && token;

  useEffect(() => {
    if (!interfaceHidden) {
      dispatchToggleInterface(true);
    }
    return () => {
      if (interfaceHidden) {
        dispatchToggleInterface(false);
      }
    }
  }, [interfaceHidden]);

  useEffect(() => {
    // only allow account and settings unless logged in
    if (!loggedIn && !['account', 'settings'].includes(launcherPage)) {
      dispatchLauncherPage('account');
    }
    // disallow store if no sale available
    else if (!priceConstantsLoading && !priceConstants?.ADALIAN_PRICE_ETH && launcherPage === 'store') {
      dispatchLauncherPage('account');
    }
  }, [launcherPage, loggedIn, priceConstants, priceConstantsLoading])

  const menuItems = useMemo(() => {
    const items = [{
      onClick: logout,
      content: <><LogoutIcon /> <label>Log Out</label></>
    }];

    if (walletId === 'argentWebWallet') {
      items.push({
        onClick: () => window.open(process.env.REACT_APP_ARGENT_WEB_WALLET_URL, '_blank', 'noopener,noreferrer'),
        content: <><WalletIcon /> <label>My Wallet</label></>
      });
    }

    return items;
  }, [logout, walletId]);

  return (
    <StyledLauncher {...props}>

      <TopLeftMenu>
        <LogoWrapper><InfluenceLogo /></LogoWrapper>
        <Nav>
          <NavItem
            onClick={() => dispatchLauncherPage('account')}
            selected={launcherPage === 'account'}>
            <StyledNavIcon /> Account
          </NavItem>
          <NavItem
            onClick={() => dispatchLauncherPage('settings')}
            selected={launcherPage === 'settings'}>
            <StyledNavIcon /> Settings
          </NavItem>
          {loggedIn && !!priceConstants?.ADALIAN_PRICE_ETH && (
            <NavItem
              onClick={() => dispatchLauncherPage('store')}
              selected={launcherPage === 'store'}>
              <StyledNavIcon /> Store
            </NavItem>
          )}
          {loggedIn && crews?.length > 0 && (
            <>
              <NavItem isRule />
              <NavItem
                onClick={() => dispatchLauncherPage('crews')}
                selected={launcherPage === 'crews'}>
                <StyledNavIcon /> My Crews
                <Badge subtler value={crews?.length} />
              </NavItem>
            </>
          )}
        </Nav>
      </TopLeftMenu>

      <TopRightMenu noPadding={reactBool(loggedIn)}>
        {loggedIn
          ? (
            <DropdownNavMenu
              header={<NavMenuLoggedInUser account={account} />}
              isOpen={menuOpen}
              menuItems={menuItems}
              onClickHeader={() => setMenuOpen((o) => !o)}
              onClose={() => setMenuOpen(false)}
              openerIcon={<CloseIcon />}
              openerAsButton
              openerTooltip="Back to Game"
              onClickOpener={() => dispatchLauncherPage()}
            />
          )
          : (
            authenticating
            ? (
              <AccountButton>
                <LeftIcon connecting><Loader color="currentColor" size="0.9em" /></LeftIcon>
                <label>Logging In</label>
                <RightIcon><ChevronDoubleRightIcon /></RightIcon>
              </AccountButton>
            )
            : (
              <AccountButton onClick={login}>
                <LeftIcon connected={loggedIn}><UserIcon /></LeftIcon>
                <label>Log-In</label>
                <RightIcon><ChevronDoubleRightIcon /></RightIcon>
              </AccountButton>
            )
          )
        }
        <br /><br />
      </TopRightMenu>

      {/* TODO: animate transitions between menus (slide in/out hudmenu, slide in/out crew, slide nav diamond between selections) */}
      <BottomLeftMenu>
        {loggedIn && launcherPage === 'crews' && <Crews />}
      </BottomLeftMenu>
      {loggedIn && launcherPage === 'crews' && <HudMenu forceOpenMenu="MY_CREWS" />}

      <ContentWrapper>
        <MainContent>
          {launcherPage === 'account' && (<></>)}
          {launcherPage === 'settings' && <Settings />}
          {launcherPage === 'store' && <Store />}
        </MainContent>

        <PlayButton disabled={authenticating} onClick={() => dispatchLauncherPage()}>
          {loggedIn ? 'Play' : 'Explore'}
        </PlayButton>

        <Footer>
          <div>
          </div>
          <div>
            <a href="https://influenceth.io" target="_blank" rel="noopener noreferrer">About</a>
            <a href="https://discord.gg/influenceth" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://wiki.influenceth.io" target="_blank" rel="noopener noreferrer">Wiki</a>
          </div>
          <div>
            {process.env.REACT_APP_BRIDGE_URL &&
              <a href={process.env.REACT_APP_BRIDGE_URL} target="_blank" rel="noopener noreferrer"><MyAssetIcon /> Assets Portal</a>
            }
            <a href={process.env.REACT_APP_BRIDGE_URL} target="_blank" rel="noopener noreferrer"><DownloadIcon /> Install App</a>
          </div>
        </Footer>
      </ContentWrapper>
    </StyledLauncher>
  );
};

export default Launcher;
