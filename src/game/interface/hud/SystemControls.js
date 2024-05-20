import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import {
  CrewmateCreditIcon,
  MenuIcon,
  SwayIcon,
  WarningIcon
} from '~/components/Icons';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useSwayBalance from '~/hooks/useSwayBalance';
import useAccountFormatted from '~/hooks/useAccountFormatted';
import IconButton from '~/components/IconButton';
import { FaCaretRight } from 'react-icons/fa';
import { menuPadding } from '~/game/Launcher';

const StyledSystemControls = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding: ${menuPadding}px 6px 0 0;
  pointer-events: all;
  position: absolute;
  right: 0;
  top: 0;
  transition: opacity 250ms ease;
  z-index: 2;
`;

const MobileWarning = styled.div`
  align-items: center;
  color: orangered;
  display: flex;
  font-size: 13px;
  @media (min-width: ${p => p.theme.breakpoints.mobile + 1}px) {
    display: none;
  }
`;

const SwayBalance = styled.div`
  align-items: center;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  display: flex;
  filter: drop-shadow(0px 0px 2px rgb(0 0 0));
  font-size: 24px;
  padding-right: 16px;
  margin-right: 16px;

  & label {
    color: #FFF;
    font-size: 85%;
  }
`;

const CrewmateCreditBalance = styled(SwayBalance)`
  & > svg {
    color: ${p => p.theme.colors.main};
  }
  & label {
    font-size: 70%;
    margin-left: 6px;
    & b {
      color: ${p => p.theme.colors.main};
      font-weight: normal;
    }
  }
`;

const HoverContent = styled.label`
  display: none;
`;
const NoHoverContent = styled.label`
  display: block;
`;

const LoggedInButton = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.darkMainRGB}, 0.2);
  border: 1px solid;
  border-color: rgba(${p => p.theme.colors.mainRGB}, 0.4);
  border-radius: 20px;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  height: 34px;
  justify-content: center;
  margin-right: 16px;
  overflow: hidden;
  position: relative;
  transition: margin-right 150ms ease, width 150ms ease;
  ${p => p.isVisible
    ? `
      border-width: 1px;
      margin-right: 16px;
      width: 220px;
    `
    : `
      border-width: 0px;
      margin: 0;
      width: 0;
    `
  }

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
    border-color: rgba(${p => p.theme.colors.mainRGB}, 0.8);
    color: white;
    & ${HoverContent} {
      display: block;
    }
    & ${NoHoverContent} {
      display: none;
    }
  }
`;

const GreenDot = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.successRGB}, 0.15);
  border-radius: 100%;
  display: flex;
  justify-content: center;
  height: 18px;
  left: 8px;
  position: absolute;
  top: 8px;
  width: 18px;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.successRGB},1);
    border-radius: 100%;
    display: block;
    height: 10px;
    width: 10px;
  }
`;

const SystemControls = () => {
  const { accountAddress, authenticated, logout } = useSession();
  const { adalianRecruits, arvadianRecruits } = useCrewContext();

  const { data: swayBalance } = useSwayBalance();

  const launcherPage = useStore(s => s.launcherPage);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const [showAuthedButton, setShowAuthedButton] = useState(!(authenticated && launcherPage));

  const totalRecruitCredits = useMemo(() => 5 || (adalianRecruits + arvadianRecruits), [adalianRecruits, arvadianRecruits])
  const formattedAccount = useAccountFormatted({ address: accountAddress, truncate: true, doNotReplaceYou: true });

  const onToggleLauncher = useCallback(() => {
    if (launcherPage) dispatchLauncherPage();
    else dispatchLauncherPage('play');
  }, [launcherPage]);

  // (just used for animation in/out of auth button)
  useEffect(() => {
    setTimeout(() => { setShowAuthedButton(authenticated && launcherPage); }, 0);
  }, [authenticated, !launcherPage]);

  return (
    <StyledSystemControls>
      <MobileWarning>
        <WarningIcon />
        <span>Mobile is not well supported, please use desktop.</span>
      </MobileWarning>

      {totalRecruitCredits && (
        <CrewmateCreditBalance>
          <CrewmateCreditIcon />
          <label>{(totalRecruitCredits || 0).toLocaleString()} <b>Crewmate Credit{totalRecruitCredits === 1 ? '' : 's'}</b></label>
        </CrewmateCreditBalance>
      )}

      {swayBalance !== undefined && (
        <SwayBalance>
          <SwayIcon />
          <label>{swayBalance.toLocaleString({ maximumFractionDigits: 0 })}</label>
        </SwayBalance>
      )}

      {authenticated && (
        <LoggedInButton onClick={logout} isVisible={!!showAuthedButton}>
          <GreenDot />
          <NoHoverContent>{formattedAccount}</NoHoverContent>
          <HoverContent>Log Out</HoverContent>
        </LoggedInButton>
      )}

      <IconButton onClick={onToggleLauncher} style={{ fontSize: 17 }}>
        {launcherPage ? <FaCaretRight /> : <MenuIcon />}
      </IconButton>

    </StyledSystemControls>
  );
};

export default SystemControls;
