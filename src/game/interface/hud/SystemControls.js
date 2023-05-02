import { useCallback } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import HudIconButton from '~/components/HudIconButton';
import {
  BugIcon,
  MenuIcon,
  SettingsIcon, 
  ResetCameraIcon,
  WarningIcon } from '~/components/Icons';

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
  opacity: 0.5;
  pointer-events: all;
  position: absolute;
  right: 5px;
  top: 0;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
`;

const VerticalRule = styled.div`
  border-left: 1px solid #CCC;
  height: 28px;
  margin-left: 14px;
  opacity: 0.33;
  padding-left: 14px;
`;

const SystemControls = (props) => {
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);

  const openHelpChannel = useCallback(() => {
    window.open(process.env.REACT_APP_HELP_URL, '_blank');
  }, []);

  return (
    <StyledSystemControls>

      <MobileWarning>
        <WarningIcon />
        <span>Mobile is not well supported in Testnet.</span>
      </MobileWarning>

      {process.env.REACT_APP_HELP_URL && (
        <HudIconButton
          data-tip="Report a Testnet Bug"
          onClick={openHelpChannel}>
          <BugIcon />
        </HudIconButton>
      )}

      <HudIconButton
        data-tip="Realign camera to poles"
        onClick={dispatchReorientCamera}>
        <ResetCameraIcon />
      </HudIconButton>

      <VerticalRule />

      {/* TODO: consider mute/unmute button here */}

      <HudIconButton
        data-tip="Settings"
        onClick={() => dispatchLauncherPage('settings')}>
        <SettingsIcon />
      </HudIconButton>

      <HudIconButton
        data-tip="Main Menu"
        onClick={() => dispatchLauncherPage(true)}>
        <MenuIcon />
      </HudIconButton>
    </StyledSystemControls>
  );
};

export default SystemControls;
