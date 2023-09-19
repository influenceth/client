import { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { PuffLoader } from 'react-spinners';
import ReactTooltip from 'react-tooltip';

import ClipCorner from '~/components/ClipCorner';
import useAsteroid from '~/hooks/useAsteroid';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import actionStage from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import BuildShip from './actionDialogs/BuildShip';
import Construct from './actionDialogs/Construct';
import ControlAsteroid from './actionDialogs/ControlAsteroid';
import EmergencyModeGenerate from './actionDialogs/EmergencyModeGenerate';
import EmergencyModeToggle from './actionDialogs/EmergencyModeToggle';
import EjectCrew from './actionDialogs/EjectCrew';
import EvictShip from './actionDialogs/EvictShip';
import Extract from './actionDialogs/Extract';
import NewCoreSample from './actionDialogs/NewCoreSample';
import Deconstruct from './actionDialogs/Deconstruct';
import ImproveCoreSample from './actionDialogs/ImproveCoreSample';
import LandShip from './actionDialogs/LandShip';
import LaunchShip from './actionDialogs/LaunchShip';
import MarketplaceOrder from './actionDialogs/MarketplaceOrder';
import PlanBuilding from './actionDialogs/PlanBuilding';
import Refine from './actionDialogs/Refine';
import SetCourse from './actionDialogs/SetCourse';
import StationCrew from './actionDialogs/StationCrew';
import SurfaceTransfer from './actionDialogs/SurfaceTransfer';
import TransferToSite from './actionDialogs/TransferToSite';
import UnplanBuilding from './actionDialogs/UnplanBuilding';
import { boolAttr } from '~/lib/utils';

const cornerSize = 20;

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const Backdrop = styled.div`
  animation: ${fadeIn} 200ms linear 1;
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background-color: rgba(30, 30, 35, 0.5);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingContainer = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  min-height: 200px;
  min-width: 300px;
  width: 100%;
`;

const ModalCushion = styled.div`
  background: rgba(50, 50, 50, 0.5);
  box-sizing: border-box;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize + 4}px),
    calc(100% - ${cornerSize + 4}px) 100%,
    0 100%
  );
  max-height: 95vh;
  max-width: 90vw;
  overflow: hidden;
  padding: 5px;
`;

const Modal = styled.div`
  background: ${p => p.background};
  border: 1px solid ${p => p.borderColor};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    0 100%
  );
  position: relative;
`;

const ModalInner = styled.div`
  color: white;
  display: flex;
  max-height: ${p => p.isLoading ? `200px` : `calc(95vh - 12px)`};
  max-width: ${p => p.isLoading ? `300px` : `calc(90vw - 12px)`};
  overflow: hidden;
  transition: max-width 250ms ease, max-height 250ms ease;
`;

const txHex = theme.colors.lightPurple;
const txRGB = hexToRGB(txHex);
export const theming = {
  [actionStage.NOT_STARTED]: {
    background: 'black',
    borderColor: '#3a3a3a',
    // cushion: 'rgba(50, 50, 50, 0.5)',
    headerBackground: `rgba(${theme.colors.mainRGB}, 0.15)`,
    highlight: '#999',
    label: 'Set Up',
  },
  [actionStage.STARTING]: {
    background: '#0e0e17',
    borderColor: '#262766',
    // cushion: `rgba(${txRGB}, 0.25)`,
    headerBackground: `rgba(${txRGB}, 0.12)`,
    highlight: txHex,
    label: 'Pending',
  },
  [actionStage.IN_PROGRESS]: {
    background: '#0d1417',
    borderColor: '#183947',
    // cushion: `rgba(${theme.colors.mainRGB}, 0.5)`,
    headerBackground: `rgba(${theme.colors.mainRGB}, 0.3)`,
    highlight: theme.colors.main,
    label: 'In Progress',
  },
  [actionStage.READY_TO_COMPLETE]: {
    background: '#081816',
    borderColor: '#124c47',
    // cushion: `rgba(${theme.colors.successRGB}, 0.5)`,
    headerBackground: `rgba(${theme.colors.successRGB}, 0.22)`,
    highlight: theme.colors.success,
    label: 'Ready',
  }
};
theming[actionStage.COMPLETING] = { ...theming[actionStage.STARTING] };
theming[actionStage.COMPLETED] = { ...theming[actionStage.READY_TO_COMPLETE] };
theming[actionStage.COMPLETED].label = 'Results';


export const useAsteroidAndLot = (props = {}) => {
  const selectedLot = useStore(s => s.asteroids.lot);
  const { asteroidId: defaultAsteroidId, lotId: defaultLotId } = selectedLot || {};
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(props.asteroidId || defaultAsteroidId);

  const { data: lot, isLoading: lotIsLoading } = useLot(
    props.asteroidId && props.lotId ? props.asteroidId : defaultAsteroidId,
    props.asteroidId && props.lotId ? props.lotId : defaultLotId,
  );

  // close dialog if cannot load asteroid and lot
  useEffect(() => {
    if (!asteroid || !lot) {
      if (!asteroidIsLoading && !lotIsLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, asteroidIsLoading, lotIsLoading]);

  return {
    asteroid,
    lot,
    isLoading: asteroidIsLoading || lotIsLoading
  }
};

const ActionImage = styled.div`
  background: url("${p => p.src}") center center no-repeat;
  background-size: cover;
  height: 250px;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 0;
`;

const ActionMain = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  position: relative;
  z-index: 1;
`;

// TODO: transition in
export const ActionDialogInner = ({ actionImage, children, isLoading, stage }) => (
  <Modal {...theming[stage]}>
    <ModalInner isLoading={boolAttr(isLoading)}>
      {isLoading && <LoadingContainer><PuffLoader color="white" /></LoadingContainer>}
      {!isLoading && (
        <>
          <ActionImage src={actionImage} />
          <ActionMain>
            {children}
          </ActionMain>
        </>
      )}
    </ModalInner>
    <ReactTooltip id="actionDialog" place="left" effect="solid" />
    <ClipCorner dimension={cornerSize} color={theming[stage].borderColor} />
  </Modal>
);

const ActionDialog = ({ type, params }) => {
  const setAction = useStore(s => s.dispatchActionDialog);

  const allProps = useMemo(() => ({
    ...params,
    onSetAction: setAction,
    onClose: () => setAction(),
  }), [params, setAction]);

  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.key === 'Escape' || e.which === 32) {
        setAction();
      }
    };
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keyup', onKeyUp);
    }
  }, []);

  return (
    <Backdrop>
      <ModalCushion>
        {type === 'BUILD_SHIP' && <BuildShip {...allProps} />}
        {type === 'CONTROL_ASTEROID' && <ControlAsteroid {...allProps} />}
        {type === 'PLAN_BUILDING' && <PlanBuilding {...allProps} />}
        {type === 'UNPLAN_BUILDING' && <UnplanBuilding {...allProps} />}
        {type === 'CONSTRUCT' && <Construct {...allProps} />}
        {type === 'DECONSTRUCT' && <Deconstruct {...allProps} />}
        {type === 'EJECT_CREW' && <EjectCrew {...allProps} />}
        {type === 'EJECT_GUEST_CREW' && <EjectCrew {...allProps} guests />}
        {type === 'EMERGENCY_MODE_GENERATE' && <EmergencyModeGenerate {...allProps} />}
        {type === 'EMERGENCY_MODE_TOGGLE' && <EmergencyModeToggle {...allProps} />}
        {type === 'EVICT_SHIP' && <EvictShip {...allProps} />}
        {type === 'EXTRACT_RESOURCE' && <Extract {...allProps} />}
        {type === 'LAND_SHIP' && <LandShip {...allProps} />}
        {type === 'LAUNCH_SHIP' && <LaunchShip {...allProps} />}
        {type === 'IMPROVE_CORE_SAMPLE' && <ImproveCoreSample {...allProps} />}
        {type === 'NEW_CORE_SAMPLE' && <NewCoreSample {...allProps} />}
        {type === 'MARKETPLACE_ORDER' && <MarketplaceOrder {...allProps} />}
        {type === 'REFINE' && <Refine {...allProps} />}
        {type === 'SET_COURSE' && <SetCourse {...allProps} />}
        {type === 'STATION_CREW' && <StationCrew {...allProps} />}
        {type === 'STATION_CREW_AS_GUESTS' && <StationCrew {...allProps} guests />}
        {type === 'SURFACE_TRANSFER' && <SurfaceTransfer {...allProps} />}
        {type === 'TRANSFER_TO_SITE' && <TransferToSite {...allProps} />}
      </ModalCushion>
    </Backdrop>
  );
}

const ActionDialogWrapper = () => {
  const actionDialog = useStore(s => s.actionDialog);
  // const actionDialog = { params: { asteroidId: 1, lotId: 1 }, type: 'NEW_CORE_SAMPLE' }; // (for debugging)
  return actionDialog?.type ? <ActionDialog {...actionDialog} /> : null;
};

export default ActionDialogWrapper;
