import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { BrowserRouter as Router } from 'react-router-dom';
import { useDetectGPU } from '@react-three/drei';

import Interface from '~/views/Interface';
import Scene from '~/views/Scene';
import theme from '~/theme';

const StyledMain = styled.main`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Game = (props) => {
  const gpuInfo = useDetectGPU();
  const [ showScene, setShowScene ] = useState(false);

  useEffect(() => {
    if (!gpuInfo) return;

    if (!gpuInfo.isMobile) {
      if (gpuInfo.tier > 0) {
        setShowScene(true)
      } else {
        // TODO: send prompt to turn on hardware acceleration
      }
    }
  }, [ gpuInfo ]);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <StyledMain>
          <Interface />
          {showScene && <Scene />}
        </StyledMain>
      </Router>
    </ThemeProvider>
  );
};

export default Game;
