import { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { PuffLoader as Loader } from 'react-spinners';
import { Tooltip } from 'react-tooltip';

import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import {
  ChevronDoubleRightIcon,
  UserIcon,
} from '~/components/Icons';
import InfluenceLogo from '~/components/InfluenceLogo';
import NavIcon from '~/components/NavIcon';
import { headerHeight, menuPadding } from '~/game/uiConstants';
import usePriceConstants from '~/hooks/usePriceConstants';
import Play from './launcher/Play';
import Settings from './launcher/Settings';
import Store from './launcher/Store';
import HudMenu from './interface/hud/HudMenu';
import SystemControls from './interface/hud/SystemControls';
import Help from './launcher/Help';
import Rewards from './launcher/Rewards';

const DISABLE_LAUNCHER_TRAILER = true && process.env.NODE_ENV === 'development';

const footerHeight = 80;
export const navMenuWidth = 250;

// TODO: should add in/out transitions to this page
const StyledLauncher = styled.div`
  background: linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.75) 100%);
  backdrop-filter: blur(4px) saturate(100%);
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

const Nav = styled.div`
  margin-top: ${menuPadding}px;
  width: ${navMenuWidth - menuPadding}px;
`;

const Icon = styled.div``;

const initialBorder = 3;
const hoverBorder = 4;
const NavItem = styled.div`
  align-items: center;
  color: ${p => p.selected ? 'white' : (p.isExternal ? '#777' : p.theme.colors.main)};
  cursor: ${p => p.selected ? p.theme.cursors.default : p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: ${p => p.selected ? 24 : 17}px;
  height: 38px;
  text-transform: uppercase;
  transition: color 250ms ease, font-size 250ms ease;

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

  & ${Icon} {
    color: ${p => p.theme.colors.main};
    font-size: 17px;
    margin-right: 12px;
    opacity: ${p => p.selected ? 1 : 0};
    transition: opacity 250ms ease;
  }

  ${p => p.isExternal && `
    margin-left: -25px;
    padding-left: 25px;
    position: relative;
    &:before {
      border: solid transparent;
      border-width: ${initialBorder}px 0 ${initialBorder}px ${initialBorder}px;
      border-left-color: #555;
      content: '';
      position: absolute;
      left: 0;
      top: 3px;
      bottom: 3px;

      transition: border-color 250ms ease, border-width 250ms ease;
    }
  `}

  &:hover {
    color: white;
    ${p => p.isExternal && `
      &:before {
        border-left-color: white;
        border-width: ${hoverBorder}px 0 ${hoverBorder}px ${hoverBorder}px;
      }
    `}
  }
`;

const LogoWrapper = styled.div`
  height: ${headerHeight}px;
  padding: 8px;
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
const NoHoverContent = styled.label`
  display: block;
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
  width: 300px;
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
        display: block;
      }
      & ${NoHoverContent} {
        display: none;
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
  margin: 20px 0 20px;
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
  width: 100%;
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
    align-content: center;

    & > a, & > span {
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
  const { authenticating, authenticated, login, walletId } = useSession();
  const { data: priceConstants, isLoading: priceConstantsLoading } = usePriceConstants();

  const launcherPage = useStore(s => s.launcherPage);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);
  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);
  const dispatchCutscene = useStore(s => s.dispatchCutscene);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);

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
    // NOTE: (currently not disallowing any for logged out users)
    // limit selection if logged out
    // if (!authenticated && !['play', 'help', 'rewards', 'settings', 'store'].includes(launcherPage)) {
    //   dispatchLauncherPage('play');
    // }
    // disallow store if no sale available
    if (!priceConstantsLoading && !priceConstants?.ADALIAN_PURCHASE_PRICE && launcherPage === 'store') {
      dispatchLauncherPage('play');
    }
  }, [launcherPage, authenticated, priceConstants, priceConstantsLoading]);

  const onInstallApp = useCallback(async () => {
    window.installPrompt.prompt();
    const { outcome } = await window.installPrompt.userChoice;
    if (outcome === 'accepted') {
      window.installPrompt = null;
    }
  }, []);

  const onClickPlay = useCallback(() => {
    dispatchLauncherPage();
    if (!hasSeenIntroVideo && !DISABLE_LAUNCHER_TRAILER) {
      dispatchSeenIntroVideo(true);
      dispatchCutscene(
        `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/videos/intro.m3u8`,
        true
      );
    }
  }, [hasSeenIntroVideo]);

  const openHelpChannel = useCallback(() => {
    window.open(process.env.REACT_APP_HELP_URL, '_blank', 'noopener');
  }, []);

  const openAssetsPortal = useCallback(() => {
    window.open(process.env.REACT_APP_BRIDGE_URL, '_blank', 'noopener');
  }, []);

  const openWebWalletDashboard = useCallback(() => {
    window.open(`${process.env.REACT_APP_ARGENT_WEB_WALLET_URL}`, '_blank', 'noopener');
  }, []);

  return (
    <StyledLauncher {...props}>
      {launcherPage === 'play' && <HudMenu />}

      <TopLeftMenu>
        <LogoWrapper><InfluenceLogo /></LogoWrapper>
        <Nav>
          <NavItem
            onClick={() => dispatchLauncherPage('play')}
            selected={launcherPage === 'play'}>
            <StyledNavIcon /> Play
          </NavItem>
          <NavItem
            onClick={() => dispatchLauncherPage('store')}
            selected={launcherPage === 'store'}>
            <StyledNavIcon /> Store
          </NavItem>
          <NavItem
            onClick={() => dispatchLauncherPage('help')}
            selected={launcherPage === 'help'}>
            <StyledNavIcon /> Help
          </NavItem>
          <NavItem
            onClick={() => dispatchLauncherPage('rewards')}
            selected={launcherPage === 'rewards'}>
            <StyledNavIcon /> Rewards
          </NavItem>
          <NavItem
            onClick={() => dispatchLauncherPage('settings')}
            selected={launcherPage === 'settings'}>
            <StyledNavIcon /> Settings
          </NavItem>

          <NavItem isRule />

          {process.env.REACT_APP_BRIDGE_URL && (
            <NavItem onClick={openAssetsPortal} isExternal>
              <StyledNavIcon /> Assets Portal
            </NavItem>
          )}

          {walletId === 'argentWebWallet' && (
            <NavItem onClick={openWebWalletDashboard} isExternal>
              <StyledNavIcon /> Wallet Dashboard
            </NavItem>
          )}

          {process.env.REACT_APP_HELP_URL && (
            <NavItem onClick={openHelpChannel} isExternal>
              <StyledNavIcon /> Bug Report
            </NavItem>
          )}

          {!!window.installPrompt && (
            <NavItem onClick={onInstallApp} isExternal>
              <StyledNavIcon /> Desktop App
            </NavItem>
          )}

        </Nav>
      </TopLeftMenu>

      <SystemControls />

      <ContentWrapper id="contentwrapper">
        <Tooltip id="launcherTooltip" place="left" delayHide={150} />

        <MainContent>
          {launcherPage === 'play' && <Play />}
          {launcherPage === 'store' && <Store />}
          {launcherPage === 'help' && <Help />}
          {launcherPage === 'rewards' && <Rewards />}
          {launcherPage === 'settings' && <Settings />}
        </MainContent>

        {launcherPage === 'play' && (
          <>
            {authenticating && (
              <AccountButton onClick={login}>
                <LeftIcon connecting><Loader color="currentColor" size="0.9em" /></LeftIcon>
                <label>Logging In</label>
                <RightIcon><ChevronDoubleRightIcon /></RightIcon>
              </AccountButton>
            )}
            {!authenticated && !authenticating && (
              <AccountButton onClick={login}>
                <LeftIcon connected={authenticated}><UserIcon /></LeftIcon>
                <label>Log-In</label>
                <RightIcon><ChevronDoubleRightIcon /></RightIcon>
              </AccountButton>
            )}

            <PlayButton disabled={authenticating} onClick={onClickPlay}>
              {authenticated ? 'Play' : 'Explore World'}
            </PlayButton>
          </>
        )}

        <Footer>
          <div>
            <a href="https://influenceth.io" target="_blank" rel="noopener noreferrer">About</a>
            <a href="https://discord.gg/influenceth" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://wiki.influenceth.io" target="_blank" rel="noopener noreferrer">Wiki</a>
          </div>
        </Footer>
      </ContentWrapper>
    </StyledLauncher>
  );
};

export default Launcher;
