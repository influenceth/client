import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route } from 'react-router-dom';

import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';
import WatchlistTable from './interface/details/WatchlistTable';
import AsteroidDetails from './interface/details/AsteroidDetails';

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

  & a {
    color: ${props => props.theme.colors.mainText};
  }

  & a:hover {
    color: white;
    text-decoration: none;
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
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
          <Route path="/watchlist">
            <WatchlistTable />
          </Route>
          <Route path="/asteroids/:i">
            <AsteroidDetails />
          </Route>
        </Switch>
        <MainMenu />
      </MainContainer>
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
