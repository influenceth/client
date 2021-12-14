import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

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

const Game = (props) => {
  const gpuInfo = useDetectGPU();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ showScene, setShowScene ] = useState(false);
  const [ loading, setLoading ] = useState(true);

  const onVideoComplete = () => {
    setLoading(false);
  };

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

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Referral />
        <Switch>
          <Route exact path="/landing/:source?">
            <LandingPage />
          </Route>
          <Route>
            {loading && <Intro onVideoComplete={onVideoComplete} />}
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
