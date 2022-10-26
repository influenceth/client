import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

import { AuthProvider } from '~/contexts/AuthContext';
import { ChainTransactionProvider } from '~/contexts/ChainTransactionContext';
import { ClockProvider } from '~/contexts/ClockContext';
import { EventsProvider } from '~/contexts/EventsContext';
import { WalletProvider } from '~/contexts/WalletContext';
import Audio from '~/game/Audio';
import Intro from '~/game/Intro';
import Interface from '~/game/Interface';
import LandingPage from '~/game/Landing';
import Redirector from '~/game/Redirector';
import Referral from '~/game/Referral';
import Scene from '~/game/Scene';
import useServiceWorker from '~/hooks/useServiceWorker';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import theme from '~/theme';

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
  .s-dialog {
    z-index: 1010 !important;
  }
  .s-overlay {
    z-index: 1009 !important;
  }
`;

const DISABLE_INTRO = process.env.NODE_ENV === 'development';

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
    setIntroEnabled(false);
  }, []);

  useEffect(() => {
    if (!gpuInfo) return;

    if (!gpuInfo.isMobile) {
      setShowScene(true);

      // init autodetect (since it was recently added to store)
      if (graphics.autodetect === undefined) {
        console.log('autodetect undefined');
        setAutodetect(
          graphics.textureQuality === GRAPHICS_DEFAULTS[gpuInfo.tier].textureQuality,
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
  }, [ gpuInfo, createAlert, dispatchGpuInfo ]);

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
        <EventsProvider>
          <ChainTransactionProvider>
            <ThemeProvider theme={theme}>
              <GlobalStyle />
              <Router>
                <Redirector />
                <Referral />
                <Switch>
                  <Route path="/play">
                    <LandingPage />
                  </Route>
                  <Route>
                    {introEnabled && <Intro onComplete={onIntroComplete} />}
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
          </ChainTransactionProvider>
        </EventsProvider>
      </AuthProvider>
    </WalletProvider>
  );
};

export default Game;
