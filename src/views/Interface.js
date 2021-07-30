import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route } from 'react-router-dom';

import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';

const StyledInterface = styled.div`
  align-items: stretch;
  bottom: 0;
  display: flex;
  flex-direction: row;
  pointer-events: none;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 1000;
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  justify-content: flex-end;
  position: relative;
  height: 100%;
`;

const Interface = () => {
  return (
    <StyledInterface>
      <ReactTooltip id="global" place="left" effect="solid" />
      <MainContainer>
        <Switch>
          <Route path="/owned-asteroids">
            <OwnedAsteroidsTable />
          </Route>
        </Switch>
        <MainMenu />
      </MainContainer>
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
