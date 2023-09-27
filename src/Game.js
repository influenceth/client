import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { BrowserRouter as Router, Switch, Route, useHistory } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

import { ActionItemProvider } from '~/contexts/ActionItemContext';
import { ActivitiesProvider } from '~/contexts/ActivitiesContext';
import { AuthProvider } from '~/contexts/AuthContext';
import { CrewProvider } from './contexts/CrewContext';
import { ChainTransactionProvider } from '~/contexts/ChainTransactionContext';
import { ClockProvider } from '~/contexts/ClockContext';
import { DevToolProvider } from '~/contexts/DevToolContext';
import { WalletProvider } from '~/contexts/WalletContext';
import { WebsocketProvider } from '~/contexts/WebsocketContext';
import Audio from '~/game/Audio';
import Interface from '~/game/Interface';
import LandingPage from '~/game/Landing';
import Referral from '~/game/Referral';
import Scene from '~/game/Scene';
import useServiceWorker from '~/hooks/useServiceWorker';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import theme from '~/theme';
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

const DISABLE_LAUNCHER_LANDING = process.env.NODE_ENV === 'development';

const LauncherRedirect = () => {
  const { account } = useAuth();
  const history = useHistory();

  const launcherPage = useStore(s => s.launcherPage);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  // redirect to launcher if initial load and trying to link to /launcher/*
  useEffect(() => {
    const parts = history.location.pathname.split('/').slice(1);
    const deeplink = parts[0] === 'launcher';
    if (deeplink || !DISABLE_LAUNCHER_LANDING) {
      const destinationPage = (deeplink && parts[1]) ? parts[1] : true;
      if (launcherPage !== destinationPage) {
        dispatchLauncherPage(destinationPage);
      }
      if (deeplink) {
        history.replace('/');
      }
    }
  }, []);

  // redirect to launcher if was logged in and is now logged out (and not already on launcher)
  const wasLoggedIn = useRef(false);
  useEffect(() => {
    if (account) {
      wasLoggedIn.current = true;
    } else {
      if (wasLoggedIn.current && !launcherPage) {
        dispatchLauncherPage(true);
      }
      wasLoggedIn.current = false;
    }
  }, [!account]);

  return null;
};

const Game = () => {
  const gpuInfo = useDetectGPU();
  const { updateNeeded, onUpdateVersion } = useServiceWorker();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchGpuInfo = useStore(s => s.dispatchGpuInfo);
  const setAutodetect = useStore(s => s.dispatchGraphicsAutodetectSet);
  const graphics = useStore(s => s.graphics);
  const [ showScene, setShowScene ] = useState(false);

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
          <DevToolProvider>
            <WebsocketProvider>
              <ActivitiesProvider>
                <ChainTransactionProvider>
                  <ActionItemProvider>
                    <ThemeProvider theme={theme}>
                      <GlobalStyle />
                      <Router>
                        <Referral />
                        <Switch>
                          {/* for socialmedia links that need to pull opengraph tags (will redirect to discord or main app) */}
                          <Route path="/play">
                            <LandingPage />
                          </Route>
                          {/* for everything else */}
                          <Route>
                            <LauncherRedirect />
                            <ClockProvider>
                              <StyledMain>
                                <Interface />
                                {showScene && <Scene />}
                                <Audio />
                              </StyledMain>
                            </ClockProvider>
                          </Route>
                        </Switch>
                      </Router>
                    </ThemeProvider>
                  </ActionItemProvider>
                </ChainTransactionProvider>
              </ActivitiesProvider>
            </WebsocketProvider>
          </DevToolProvider>
        </CrewProvider>
      </AuthProvider>
    </WalletProvider>
  );
};

export default Game;
