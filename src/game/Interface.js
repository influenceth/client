import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route } from 'react-router-dom';

import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import AsteroidsTable from './interface/details/AsteroidsTable';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';
import WatchlistTable from './interface/details/WatchlistTable';
import AsteroidDetails from './interface/details/AsteroidDetails';
import Settings from './interface/details/Settings';
import Alerts from './interface/Alerts';

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
    color: ${p => p.theme.colors.mainText};
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
      <Alerts />
      <MainContainer>
        <Switch>
          <Route exact path="/asteroids">
            <AsteroidsTable />
          </Route>
          <Route path="/owned-asteroids">
            <OwnedAsteroidsTable />
          </Route>
          <Route path="/watchlist">
            <WatchlistTable />
          </Route>
          <Route path="/asteroids/:i">
            <AsteroidDetails />
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>
        </Switch>
        <MainMenu />
      </MainContainer>
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
