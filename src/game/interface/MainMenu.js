import { useEffect, useMemo, useState } from 'react';
// import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import {
  MdFullscreen as FullscreenIcon,
  MdFullscreenExit as ExitFullscreenIcon } from 'react-icons/md';
import screenfull from 'screenfull';

import { BackIcon } from '~/components/Icons';
import PrereleaseLogoSVG from '~/assets/images/logo-prerelease.svg';
import useStore from '~/hooks/useStore';
import useScreenSize from '~/hooks/useScreenSize';
import HudIconButton from '~/components/HudIconButton';
import TimeControls from './mainMenu/TimeControls';

const StyledMainMenu = styled.div`
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
`;

const Actionable = styled.div`
  & > * {
    pointer-events: all;
  }
`;

const StyledPreReleaseIcon = styled(PrereleaseLogoSVG)`
  height: 32px;
  margin-bottom: 3px;
  margin-left: 3px;
`;

const barHeight = 50;
const centerAreaWidth = 560;
const centerAreaHalfWidth = centerAreaWidth / 2;
const cornerButtonWidth = 40;
const dipAmount = 15;
const transitionWidth = dipAmount;
const secondDipMult = 0.6;
const minWidth = 2 * (centerAreaHalfWidth + cornerButtonWidth + 2 * transitionWidth);
const BottomBar = styled.div`
  background: black;
  height: ${barHeight}px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;

  @media (min-width: ${minWidth}px) {
    clip-path: polygon(
      0% 100%,
      0% 0%,
      ${cornerButtonWidth}px 0%,
      ${cornerButtonWidth + transitionWidth}px ${dipAmount}px,
      calc(50% - ${centerAreaHalfWidth + transitionWidth * secondDipMult}px) ${dipAmount}px,
      calc(50% - ${centerAreaHalfWidth}px) ${(1 + secondDipMult) * dipAmount}px,
      calc(50% + ${centerAreaHalfWidth}px) ${(1 + secondDipMult) * dipAmount}px,
      calc(50% + ${centerAreaHalfWidth + transitionWidth * secondDipMult}px) ${dipAmount}px,
      calc(100% - ${cornerButtonWidth + transitionWidth}px) ${dipAmount}px,
      calc(100% - ${cornerButtonWidth}px) 0%,
      100% 0%,
      100% 100%
    );
  }
`;

const BottomBarBackground = styled(BottomBar)`
  background: #444;
  bottom: 1px;
`;

const HudButtonArea = styled.div`
  position: absolute;
  bottom: 4px;
  z-index: 4;
`;

const LeftHudButtonArea = styled(HudButtonArea)`
  left: 4px;
`;

const RightHudButtonArea = styled(HudButtonArea)`
  right: 4px;
`;

const TimeSection = styled.div`
  position: absolute;
  right: ${cornerButtonWidth + transitionWidth}px;
  bottom: ${barHeight - dipAmount}px;
`;

// const MenuWrapper = styled.div`
//   display: flex;
//   flex-direction: row;

//   align-items: flex-end;
//   justify-content: space-around;

//   position: absolute;
//   left: 50%;
//   bottom: ${barHeight - 1.5 * dipAmount}px;
//   margin-left: -${centerAreaHalfWidth}px;
//   width: ${centerAreaWidth}px;

//   z-index: 4;
// `;

const MainMenu = () => {
  // const playSound = useStore(s => s.dispatchSoundRequested);
  const { isMobile } = useScreenSize();

  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  // const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  // const { accountAddress } = useSession();
  // const { data: crewAssignmentData } = useCrewAssignments();

  const [ fullscreen, setFullscreen ] = useState(screenfull.isEnabled && screenfull.isFullscreen);

  // TODO: genesis book deprecation vvv
  // const { crew, crewmateMap } = useCrewContext();
  // const hasGenesisCrewmate = useMemo(() => {
  //   return crew && crew?._crewmates && crewmateMap && crew._crewmates.find((i) => [1,2,3].includes(crewmateMap[i]?.coll));
  // }, [crew?._crewmates, crewmateMap]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^^^

  // const [ showMenu, setShowMenu ] = useState(!isMobile);

  // const openSection = useCallback((section) => {
  //   // activateSection(section);
  //   // TODO: ... this used to reference outliner, but outliner is gone
  //   playSound('effects.click');
  //   if (isMobile) setShowMenu(false);
  // }, [isMobile]);

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on('change', () => {
        setFullscreen(screenfull.isEnabled && screenfull.isFullscreen);
      });
    }
  }, []);

  const { backLabel, onClickBack } = useMemo(() => {
    if (zoomStatus !== 'in') return {};
    if (zoomScene?.type === 'LOT' || zoomScene?.type === 'SHIP') {
      return {
        backLabel: 'Back to Asteroid',
        onClickBack: () => dispatchZoomScene()
      }
    }
    if (!!lotId) {
      return {
        backLabel: 'Deselect Lot',
        onClickBack: () => dispatchLotSelected()
      }
    }
    return {
      backLabel: 'Back to Belt',
      onClickBack: () => updateZoomStatus('zooming-out')
    }
  }, [!!lotId, zoomScene?.type, zoomStatus]);

  return (
    <StyledMainMenu>
      <Actionable>
        <LeftHudButtonArea>
          {onClickBack && (
            <HudIconButton
              data-tip={backLabel}
              onClick={onClickBack}>
              <BackIcon />
            </HudIconButton>
          )}
          {!onClickBack && process.env.REACT_APP_CHAIN_ID !== '0x534e5f5345504f4c4941' && (
            <img
              src={`${process.env.PUBLIC_URL}/maskable-logo-48x48.png`}
              style={{ height: 38, marginLeft: 3 }} />
          )}
          {!onClickBack && process.env.REACT_APP_CHAIN_ID === '0x534e5f5345504f4c4941' && (
            <StyledPreReleaseIcon />
          )}
        </LeftHudButtonArea>

        {/* <MenuWrapper>
          {!!accountAddress && (
            <Menu title="Assets">
              <MenuItem
                name="My Asteroids"
                icon={<RadiusIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Crew"
                icon={<CrewIcon />}
                onClick={() => history.push('/crew')} />
              <MenuItem
                name="My Ships"
                icon={<ShipIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Buildings"
                icon={<BuildingIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Resources"
                icon={<ResourceIcon />}
                onClick={notYet} />
              <MenuItem
                name="My Deposits"
                icon={<CoreSampleIcon />}
                onClick={notYet} />
              <MenuItem
                name="Favorites"
                icon={<FavoriteIcon />}
                onClick={() => openSection('belt.Favorites')} />
            </Menu>
          )}
          {!!accountAddress && (
            <Menu title="Events">
              <MenuItem
                name="Captain's Log"
                icon={<EyeIcon />}
                onClick={notYet} />
              <MenuItem
                name="Trips"
                icon={<RouteIcon />}
                onClick={notYet} />
              <MenuItem
                name="Crew Stories"
                icon={<CrewStoryIcon />}
                onClick={notYet} />
            </Menu>
          )}
          <Menu title="Finances">
            <MenuItem
              name="Transactions"
              icon={<TransactionIcon />}
              onClick={notYet} />
            <MenuItem
              name="Market Orders"
              icon={<OrderIcon />}
              onClick={notYet} />
            <MenuItem
              name="Leases"
              icon={<LeaseIcon />}
              onClick={notYet} />
          </Menu>
        </MenuWrapper> */}

        {!isMobile && (
          <TimeSection>
            <TimeControls />
          </TimeSection>
        )}

        <RightHudButtonArea>
          {screenfull.isEnabled && !fullscreen && !isMobile && (
            <HudIconButton
              data-tip="Go Fullscreen"
              onClick={() => screenfull.request()}>
              <FullscreenIcon />
            </HudIconButton>
          )}
          {screenfull.isEnabled && fullscreen && !isMobile && (
            <HudIconButton
              data-tip="Exit Fullscreen"
              onClick={() => screenfull.exit()}>
              <ExitFullscreenIcon />
            </HudIconButton>
          )}
        </RightHudButtonArea>
      </Actionable>

      <BottomBarBackground />
      <BottomBar />
    </StyledMainMenu>
  );
};

export default MainMenu;
