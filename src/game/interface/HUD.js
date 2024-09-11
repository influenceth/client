import { useEffect, useState } from '~/lib/react-debug';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import useCrewContext from '~/hooks/useCrewContext';
import ActionDialog from './hud/ActionDialog';
import ActionItems from './hud/ActionItems';
import AvatarMenu from './hud/AvatarMenu';
import InfoPane from './hud/InfoPane';
import SystemControls from './hud/SystemControls';
import HudMenu from './hud/HudMenu';
import SceneBanner from './hud/SceneBanner';
import WelcomeSimulation from './hud/WelcomeSimulation';
import useStore from '~/hooks/useStore';
import useSession from '~/hooks/useSession';
import InfluenceLogo from '~/components/InfluenceLogo';
import { headerHeight } from '~/game/uiConstants';
import useSimulationEnabled from '~/hooks/useSimulationEnabled';

const bottomMargin = 60;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  position: absolute;
  bottom: ${bottomMargin}px;
  z-index: 2;
`;

const LogoWrapper = styled.div`
  cursor: ${p => p.theme.cursors.active};
  height: ${headerHeight}px;
  margin: 25px;
  padding: 8px;
  pointer-events: all;
  & > svg {
    height: 100%;
  }
`;

const LeftWrapper = styled(Wrapper)`
  display: flex;
  height: calc(100% - ${bottomMargin - 24}px);
  left: 0;
  top: 0;
`;

const IconHolder = styled.div`
  align-items: center;
  border-left: 3px solid ${p => p.theme.colors.main};
  color: #999;
  display: flex;
  font-size: 22px;
  height: 36px;
  justify-content: center;
  transition: background-color 250ms ease, border-color 250ms ease, color 250ms ease;
  width: 64px;
`;

export const LeftActionButton = styled(IconHolder)`
  border-color: rgba(255,255,255,0.25);
  border-radius: 0 5px 5px 0;
  pointer-events: all;

  ${p => p.active
    ? `
      border-color: ${p.theme.colors.main};
      background-color: rgba(${p.theme.colors.mainRGB}, 0.3);
      color: white;
      cursor: ${p.theme.cursors.default};
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: #333;
        border-color: white;
        color: white;
      }
    `
  }
`;

export const Rule = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.25);
  opacity: ${p => p.visible ? 1 : 0};
  transition: opacity 350ms ease;
  width: 100%;
`;

const SimulationRedirector = ({ simulationEnabled }) => {
  const history = useHistory();
  const { accountAddress } = useSession(false);
  const simulationActions = useStore((s) => s.simulationActions);

  const [readyToRedirect, setReadyToRedirect] = useState();

  // redirect to /recruit when unmounted (if on last step)
  useEffect(import.meta.url, () => {
    if (simulationEnabled && simulationActions.includes('RedirectToRecruitOnLogin')) {
      setReadyToRedirect(true);
    }
  }, [simulationEnabled, simulationActions]);

  useEffect(import.meta.url, () => {
    if (readyToRedirect && !!accountAddress) {
      history.push('/recruit/0');
      setReadyToRedirect(false);
    }
  }, [accountAddress])

  return null;
};

const HUD = () => {
  const { accountAddress, authenticated, authenticating } = useSession();
  const { loading } = useCrewContext();
  const simulationEnabled = useSimulationEnabled();

  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  return (
    <>
      <LeftWrapper>
        {!authenticating && !loading
          ? (
            authenticated
              ? (
                <>
                  <AvatarMenu />
                  <ActionItems />
                </>
              )
              : (
                <>
                  <LogoWrapper onClick={() => dispatchLauncherPage(true)}><InfluenceLogo /></LogoWrapper>
                  <div style={{ flex: 1 }} />
                </>
              )
          )
          : (
            <div style={{ flex: 1 }} />
          )}

        <InfoPane />
      </LeftWrapper>

      <SceneBanner />

      <HudMenu />

      <SystemControls />

      <ActionDialog />

      {simulationEnabled && <WelcomeSimulation />}
      <SimulationRedirector simulationEnabled={simulationEnabled} />

    </>
  );
}

export default HUD;