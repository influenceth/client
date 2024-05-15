import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import Badge from '~/components/Badge';
import Button from '~/components/ButtonAlt';
import {
  BugIcon,
  CrewIcon,
  DiscordIcon,
  LoginIcon,
  LogoutIcon,
  MenuIcon,
  MyAssetIcon,
  ResetCameraIcon,
  SettingsIcon,
  StoreIcon,
  SwayIcon,
  WalletIcon,
  WarningIcon
} from '~/components/Icons';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import DropdownNavMenu, { NavMenuLoggedInUser, menuAnimationTime } from './DropdownNavMenu';
import useSwayBalance from '~/hooks/useSwayBalance';

const MobileWarning = styled.div`
  align-items: center;
  color: orangered;
  display: flex;
  font-size: 13px;
  @media (min-width: ${p => p.theme.breakpoints.mobile + 1}px) {
    display: none;
  }
`;

const StyledSystemControls = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 50px;
  pointer-events: all;
  position: absolute;
  right: 0;
  top: 0;
  transition: opacity 250ms ease;
  z-index: 2;
`;

const SwayBalance = styled.div`
  align-items: center;
  color: white;
  display: flex;
  filter: drop-shadow(0px 0px 2px rgb(0 0 0));
  font-size: 24px;
  margin-left: 25px;

  & label {
    color: #FFF;
    font-size: 85%;
  }
`;

const VerticalRule = styled.div`
  border-left: 1px solid #444;
  height: 28px;
  margin-left: 14px;
  opacity: ${p => p.hide ? 0 : 1};
  padding-left: 13px;
  transition: opacity ${menuAnimationTime}ms ease;
`;

const SystemControls = () => {
  const { accountAddress, login, logout, token, starknet } = useSession();

  const { crews } = useCrewContext();
  const { data: swayBalance } = useSwayBalance();

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  // const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);

  const [menuOpen, setMenuOpen] = useState(false);

  const openDiscord = useCallback(() => {
    window.open('https://discord.gg/influenceth', '_blank');
  }, []);

  const openHelpChannel = useCallback(() => {
    window.open(process.env.REACT_APP_HELP_URL, '_blank');
  }, []);

  const openAssetsPortal = useCallback(() => {
    window.open(process.env.REACT_APP_BRIDGE_URL, '_blank');
  }, []);

  const menuItems = useMemo(() => {
    const items = [];

    if (token) {
      items.push({
        onClick: () => dispatchLauncherPage('crews'),
        content: <><CrewIcon /> <label>My Crews <Badge subtler value={crews?.length} /></label></>
      });
    }

    items.push({
      onClick: () => dispatchLauncherPage('settings'),
      content: <><SettingsIcon /> <label>Settings</label></>
    });

    if (token) {
      items.push({
        onClick: () => dispatchLauncherPage('store'),
        content: <><StoreIcon /> <label>Store</label></>
      })
    }

    items.push({ isRule: true });

    if (token) {
      items.push({
        onClick: logout,
        content: <><LogoutIcon /> <label>Log Out</label></>
      })
    } else {
      items.push({
        onClick: login,
        content: <><LoginIcon /> <label>Log In</label></>
      })
    }

    if (token && starknet?.id === 'argentWebWallet') {
      items.push({
        onClick: () => window.open(process.env.REACT_APP_ARGENT_WEB_WALLET_URL, '_blank', 'noopener,noreferrer'),
        content: <><WalletIcon /> <label>My Wallet</label></>
      });
    }

    items.push({
      onClick: openDiscord,
      content: <><DiscordIcon /> <label>Discord</label></>
    });

    items.push({
      onClick: openAssetsPortal,
      content: <><MyAssetIcon /> <label>Assets Portal</label></>
    });

    if (process.env.REACT_APP_HELP_URL) {
      items.push({
        onClick: openHelpChannel,
        content: <><BugIcon /> <label>Support</label></>
      })
    }

    return items;
  }, [crews?.length, login, logout, token])

  return (
    <StyledSystemControls id="topMenu">
      <MobileWarning>
        <WarningIcon />
        <span>Mobile is not well supported, please use desktop.</span>
      </MobileWarning>

      {/*
      <Button
        data-tooltip-content="Realign camera to poles"
        onClick={dispatchReorientCamera}
        size="bigicon"
        style={{ fontSize: '26px', marginRight: swayBalance === undefined ? 15 : 0 }}>
        <ResetCameraIcon />
      </Button>
      */}

      {swayBalance !== undefined && (
        <SwayBalance>
          <SwayIcon />
          <label>{swayBalance.toLocaleString({ maximumFractionDigits: 0 })}</label>
        </SwayBalance>
      )}

      <VerticalRule hide={menuOpen} />

      <DropdownNavMenu
        header={<NavMenuLoggedInUser account={accountAddress} />}
        hCollapse
        isOpen={menuOpen}
        menuItems={menuItems}
        onClickOpener={() => setMenuOpen((o) => !o)}
        onClose={() => setMenuOpen(false)}
        openerIcon={<MenuIcon />}
        openerHighlight
      />
    </StyledSystemControls>
  );
};

export default SystemControls;
