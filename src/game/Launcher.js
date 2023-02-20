import { useContext, useCallback, useEffect } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ButtonPill from '~/components/ButtonPill';
import InfluenceLogo from '~/components/InfluenceLogo';
import OnClickLink from '~/components/OnClickLink';
import Time from '~/components/Time';
import Account, { logoDisplacementHeight } from './launcher/Account';
import Settings from './launcher/Settings';
import Wallets from './launcher/Wallets';

const headerFooterHeight = 100;

// TODO: should add in/out transitions to this page
const StyledLauncher = styled.div`
  align-items: center;
  backdrop-filter: blur(0.75px) saturate(70%) brightness(70%);
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: space-between;
  opacity: 1;
  padding: ${headerFooterHeight}px 0;
  position: absolute;
  width: 100vw;
  z-index: 8999;
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

const LogoWrapper = styled.div`
  left: 25px;
  height: ${headerFooterHeight - 50}px;
  position: absolute;
  top: 25px;
  & > svg {
    height: 100%;
  }

  ${p => p.hideHeader && `
    @media (min-height: ${p.hideHeader}px) {
      display: none;
    }
  `}
`;

const StyledLink = styled(OnClickLink)`
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
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  height: ${headerFooterHeight}px;
  justify-content: flex-end;
  position: absolute;
  right: 40px;
  top: 0;
  width: 200px;

  & ${AccountName} {
    color: ${p => p.theme.colors.secondaryText};
  }

  &:hover ${AccountName} {
    color: inherit;
  }
`;

const MainContent = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  // height: calc(100vh - 2 * ${headerFooterHeight}px);
`;

const StyledTime = styled(Time).attrs(() => ({
  style: {
    'font-size': '20px'
  }
}))`
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
  const { displayTime } = useContext(ClockContext);
  const launcherPage = useStore(s => s.launcherPage);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const hideInterface = useStore(s => s.dispatchHideInterface);
  const showInterface = useStore(s => s.dispatchShowInterface);
  const { walletContext, token } = useAuth();
  const { account, walletIcon, walletName } = walletContext;
  const loggedIn = account && token;

  const goToWallet = useCallback(() => {
    if (walletContext?.starknet?.id === 'Cartridge') window.open('https://cartridge.gg', '_blank');
  }, [ walletContext ]);

  useEffect(() => {
    hideInterface();
    return () => showInterface();
  }, []);

  return (
    <StyledLauncher {...props}>
      <Header>
        <LogoWrapper hideHeader={launcherPage === 'account' ? logoDisplacementHeight : 0}>
          <InfluenceLogo />
        </LogoWrapper>
        <MenuItem>
          <StyledLink activeClassName="current" onClick={() => dispatchLauncherPage('account')}>
            <span>{launcherPage === 'account' ? "Account" : "‹ Back"}</span>
          </StyledLink>
        </MenuItem>
        <MenuItem>
          <StyledLink activeClassName="current" onClick={() => dispatchLauncherPage('settings')}>
            <span>Settings</span>
          </StyledLink>
        </MenuItem>
        {loggedIn &&
          <CurrentAccount onClick={goToWallet}>
            <WalletLogo>{walletIcon}</WalletLogo>
            <AccountName account={account} wallet={walletName} />
          </CurrentAccount>
        }
      </Header>
      <MainContent>
        {launcherPage === 'account' && <Account />}
        {launcherPage === 'wallets' && <Wallets />}
        {launcherPage === 'settings' && <Settings />}
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
