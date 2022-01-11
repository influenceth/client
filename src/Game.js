import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

import useServiceWorker from '~/hooks/useServiceWorker';
import useStore from '~/hooks/useStore';
import LandingPage from '~/game/Landing';
import Intro from '~/game/Intro';
import Interface from '~/game/Interface';
import Scene from '~/game/Scene';
import Audio from '~/game/Audio';
import Referral from '~/game/Referral';
import theme from '~/theme';

const StyledMain = styled.main`
  bottom: 0;
  display: flex;
  min-height: 100%;
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 100%;
`;

const DISABLE_INTRO = process.env.NODE_ENV === 'development';

const Game = (props) => {
  const gpuInfo = useDetectGPU();
  const { updateNeeded, onUpdateVersion } = useServiceWorker();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ showScene, setShowScene ] = useState(false);
  const [ introEnabled, setIntroEnabled ] = useState(!DISABLE_INTRO);

  const onIntroComplete = useCallback(() => {
    setIntroEnabled(false);
  }, []);

  useEffect(() => {
    if (!gpuInfo) return;

    if (!gpuInfo.isMobile) {
      setShowScene(true)

      if (gpuInfo.tier === 0) {
        createAlert({
          type: 'Game_GPUPrompt',
          level: 'warning'
        });
      }
    }
  }, [ gpuInfo, createAlert ]);

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
    <ThemeProvider theme={theme}>
      <Router>
        <Referral />
        <Switch>
          <Route path="/play">
            <LandingPage />
          </Route>
          <Route>
            {introEnabled && <Intro onComplete={onIntroComplete} />}
            <StyledMain>
              <Interface />
              {showScene && <Scene />}
              <Audio />
            </StyledMain>
          </Route>
        </Switch>
      </Router>
    </ThemeProvider>
  );
};

export default Game;
