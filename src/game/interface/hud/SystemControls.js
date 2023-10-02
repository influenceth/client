import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import Badge from '~/components/Badge';
import Button from '~/components/ButtonAlt';
import HudIconButton from '~/components/HudIconButton';
import {
  BugIcon,
  MenuIcon,
  SettingsIcon, 
  ResetCameraIcon,
  WarningIcon, 
  StoreIcon,
  SwayIcon,
  CrewIcon,
  LoginIcon,
  LogoutIcon,
  MyAssetIcon,
  InfluenceIcon
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useActivitiesContext from '~/hooks/useActivitiesContext';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';

const menuAnimationTime = 250;

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
  padding-left: 14px;
  transition: opacity ${menuAnimationTime}ms ease;
`;

const MainMenuWrapper = styled.div`
  align-self: flex-start;
  position: relative;
  display: flex;
  height: 50px;
  overflow: hidden;
  width: 50px;

  transition: width ${menuAnimationTime}ms ease ${p => p.open ? 0 : menuAnimationTime}ms,
              height ${menuAnimationTime}ms ease ${p => p.open ? menuAnimationTime : 0}ms;

  ${p => p.open && `
    width: 300px;
    height: 320px;
  `}
`;
const MainMenu = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: 5px;

  background: black;
  text-align: right;
  width: 100%;

  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    & > div {
      align-items: center;
      color: white;
      display: flex;
      flex: 1;
      justify-content: flex-start;
      overflow: hidden;
      max-width: calc(100% - 40px);
    }
  }
  & > ul {
    margin: 15px 0 0;
    padding: 0;
  }
`;
const LogoWrapper = styled.span`
  position: relative;
  & > svg {
    font-size: 34px;
  }
  &:after {
    content: "";
    background: ${p => p.connected ? p.theme.colors.success : p.theme.colors.error};
    position: absolute;
    bottom: 0;
    right: 0;
    border-radius: 5px;
    height: 10px;
    width: 10px;
  }
`;

const LoggedInUser = styled.div`
  flex: 1;
  font-size: 15px;
  margin-left: 10px;
  overflow: hidden;
  padding-right: 10px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;

  ${p => p.account
    ? `
      &:before {
        content: "${p.account.substr(0, 6)}"
      }
      &:after {
        content: "...${p.account.substr(-6)}"
      }
    `
    : `
      &:before {
        content: "";
      }
    `
  }
`;

const MainMenuItem = styled.li`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  padding: 0 5px;
  svg {
    font-size: 25px;
  }
  label {
    flex: 1;
    text-transform: uppercase;
  }

  ${p => p.isRule
    ? `
      height: 18px;
      &:before {
        content: "";
        display: block;
        border-top: 1px solid #333;
        width: 100%;
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      height: 36px;
      &:hover {
        background: rgba(${p.theme.colors.mainRGB}, 0.6);
        color: white;
      }
    `
  }
`;

const SystemControls = () => {
  const { account, login, logout, token, walletContext: { starknet } } = useAuth();
  const { data: activities } = useActivitiesContext();
  const { crews } = useCrewContext();
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);

  const [menuOpen, setMenuOpen] = useState(false);
  const [swayBalance, setSwayBalance] = useState();

  const openHelpChannel = useCallback(() => {
    window.open(process.env.REACT_APP_HELP_URL, '_blank');
  }, []);

  const swayUpdateTimeout = useRef();
  const updateSwayBalance = useCallback(async () => {
    if (!starknet?.account?.provider) return null;

    if (swayUpdateTimeout.current) clearTimeout(swayUpdateTimeout.current);
    
    try {
      // TODO: uncomment this when sway contract deployed
      // const balance = await starknet.account.provider.invoke({
      //   contractAddress: process.env.REACT_APP_STARKNET_SWAY_TOKEN,
      //   entrypoint: 'balanceOf',
      // });
      // setSwayBalance(balance);
    } catch (e) {
      console.error(e);
    }

    swayUpdateTimeout.current = setTimeout(updateSwayBalance, 300e3);
  }, []);

  const openAssetsPortal = useCallback(() => {
    window.open(process.env.REACT_APP_BRIDGE_URL, '_blank');
  }, []);

  useEffect(() => updateSwayBalance, [account, activities]);

  return (
    <StyledSystemControls>
      <MobileWarning>
        <WarningIcon />
        <span>Mobile is not well supported in Testnet.</span>
      </MobileWarning>

      <Button
        data-tip="Realign camera to poles"
        onClick={dispatchReorientCamera}
        size="bigicon"
        subtle
        style={{ fontSize: '26px', marginRight: swayBalance === undefined ? 15 : 0 }}>
        <ResetCameraIcon />
      </Button>

      {swayBalance !== undefined && (
        <SwayBalance>
          <SwayIcon />
          <label>{swayBalance.toLocaleString()}</label>
        </SwayBalance>
      )}

      <VerticalRule hide={menuOpen} />

      <MainMenuWrapper open={menuOpen}>
        <MainMenu open={menuOpen}>
          <div>
            <div>
              <LogoWrapper connected={!!account}>
                <InfluenceIcon />
              </LogoWrapper>
              
              <LoggedInUser account={account} />
            </div>

            <HudIconButton
              data-tip="Toggle Main Menu"
              isActive={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}>
              <MenuIcon />
            </HudIconButton>
          </div>
          <ul onClick={() => setMenuOpen(false)}>
            {token && (
              <MainMenuItem onClick={() => dispatchLauncherPage('crews')}>
                <CrewIcon /> <label>My Crews <Badge subtler value={crews?.length} /></label>
              </MainMenuItem>
            )}
            <MainMenuItem onClick={() => dispatchLauncherPage('settings')}>
              <SettingsIcon /> <label>Settings</label>
            </MainMenuItem>
            {token && (
              <MainMenuItem onClick={() => dispatchLauncherPage('store')}>
                <StoreIcon /> <label>Store</label>
              </MainMenuItem>
            )}
            <MainMenuItem isRule />
            {token
              ? (
                <MainMenuItem onClick={logout}>
                  <LogoutIcon /> <label>Log Out</label>
                </MainMenuItem>
              )
              : (
                <MainMenuItem onClick={login}>
                  <LoginIcon /> <label>Log In</label>
                </MainMenuItem>
              )
            }
            <MainMenuItem onClick={openAssetsPortal}>
              <MyAssetIcon /> <label>Assets Portal</label>
            </MainMenuItem>
            {process.env.REACT_APP_HELP_URL && (
              <MainMenuItem onClick={openHelpChannel}>
                <BugIcon /> <label>Bug Report</label>
              </MainMenuItem>
            )}
          </ul>
        </MainMenu>
      </MainMenuWrapper>
    </StyledSystemControls>
  );
};

export default SystemControls;
