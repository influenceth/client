import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { BrowserRouter as Router, Switch, Route, useHistory } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

import { AuthProvider } from '~/contexts/AuthContext';
import { CrewProvider } from './contexts/CrewContext';
import { ChainTransactionProvider } from '~/contexts/ChainTransactionContext';
import { ClockProvider } from '~/contexts/ClockContext';
import { EventsProvider } from '~/contexts/EventsContext';
import { WalletProvider } from '~/contexts/WalletContext';
import { WebsocketProvider } from '~/contexts/WebsocketContext';
import Audio from '~/game/Audio';
import Launcher from '~/game/Launcher';
import Interface from '~/game/Interface';
import LandingPage from '~/game/Landing';
import Referral from '~/game/Referral';
import Scene from '~/game/Scene';
import useServiceWorker from '~/hooks/useServiceWorker';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import theme from '~/theme';
import { ActionItemProvider } from './contexts/ActionItemContext';
import useAuth from './hooks/useAuth';

const { GRAPHICS_DEFAULTS } = constants;

const StyledMain = styled.main`
  bottom: 0;
  display: flex;
  min-height: 100%;
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 100%;
`;

// for starknet modals
const GlobalStyle = createGlobalStyle`
  label {
    cursor: inherit;
  }
  .s-dialog {
    z-index: 1010 !important;
  }
  .s-overlay {
    z-index: 1009 !important;
  }
`;

const DISABLE_INTRO = false; // process.env.NODE_ENV === 'development';
const DISABLE_LAUNCHER_LANDING = false; //process.env.NODE_ENV === 'development';

const LauncherRedirect = () => {
  const { account } = useAuth();
  const history = useHistory();
  const showInterface = useStore(s => s.dispatchShowInterface);

  // on initial load, redirect to launcher if at "/" (and not in skip-mode for dev)
  useEffect(() => {
    if (DISABLE_LAUNCHER_LANDING && account) {
      showInterface();
    } else if (history.location.pathname === '/') {
      history.push('/launcher/account');
    }
  }, []);

  return null;
};

const Game = (props) => {
  const gpuInfo = useDetectGPU();
  const { updateNeeded, onUpdateVersion } = useServiceWorker();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchGpuInfo = useStore(s => s.dispatchGpuInfo);
  const setAutodetect = useStore(s => s.dispatchGraphicsAutodetectSet);
  const graphics = useStore(s => s.graphics);
  const [ showScene, setShowScene ] = useState(false);
  const [ introEnabled, setIntroEnabled ] = useState(!DISABLE_INTRO);

  const onIntroComplete = useCallback(() => {
    // setIntroEnabled(false);
  }, []);

  const autodetectNeedsInit = graphics?.autodetect === undefined;
  useEffect(() => {
    if (!gpuInfo) return;

    if (!gpuInfo.isMobile) {
      setShowScene(true);

      // init autodetect (since it was recently added to store)
      if (autodetectNeedsInit) {
        setAutodetect(
          graphics?.textureQuality === GRAPHICS_DEFAULTS[gpuInfo.tier].textureQuality,
          gpuInfo
        );
      }

      dispatchGpuInfo(gpuInfo);

      if (gpuInfo.tier === 0) {
        createAlert({
          type: 'Game_GPUPrompt',
          level: 'warning'
        });
      }
    }
  }, [ gpuInfo, createAlert, dispatchGpuInfo, autodetectNeedsInit ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (updateNeeded) {
      createAlert({
        type: 'App_Updated',
        level: 'warning',
        duration: 0,
        hideCloseIcon: true,
        onRemoval: onUpdateVersion
      });
    }
  }, [createAlert, updateNeeded, onUpdateVersion]);

  return (
    <WalletProvider>
      <AuthProvider>
        <CrewProvider>
          <WebsocketProvider>
            <EventsProvider>
              <ChainTransactionProvider>
                <ActionItemProvider>
                  <ThemeProvider theme={theme}>
                    <GlobalStyle />
                    <Router>
                      <Referral />
                      <ClockProvider>
                        <LauncherRedirect />
                        <Switch>
                          <Route path="/play">
                            <LandingPage />
                          </Route>
                          <Route path="/launcher/*">
                            <Launcher />
                          </Route>
                        </Switch>
                        <StyledMain>
                          <Interface />
                          {showScene && <Scene />}
                          <Audio />
                        </StyledMain>
                      </ClockProvider>
                    </Router>
                  </ThemeProvider>
                </ActionItemProvider>
              </ChainTransactionProvider>
            </EventsProvider>
          </WebsocketProvider>
        </CrewProvider>
      </AuthProvider>
    </WalletProvider>
  );
};

export default Game;
