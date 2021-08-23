import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route } from 'react-router-dom';

import useScreenSize from '~/hooks/useScreenSize';
import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import AsteroidsTable from './interface/details/AsteroidsTable';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';
import OwnedCrew from './interface/details/OwnedCrew';
import CrewMemberDetails from './interface/details/CrewMemberDetails';
import WatchlistTable from './interface/details/WatchlistTable';
import AsteroidDetails from './interface/details/AsteroidDetails';
import RouteDetails from './interface/details/RouteDetails';
import Settings from './interface/details/Settings';
import Alerts from './interface/Alerts';

const StyledInterface = styled.div`
  align-items: stretch;
  bottom: 0;
  display: flex;
  flex: 1 1 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  max-width: 100%;
  min-width: 100%;
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
  flex: 1 1 0;
  height: 100%;
  justify-content: flex-end;
  position: relative;
  min-width: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    bottom: 0;
    position: absolute;
    width: 100%;
  }
`;

const Interface = () => {
  const { isMobile } = useScreenSize();

  return (
    <StyledInterface>
      {!isMobile && <ReactTooltip id="global" place="left" effect="solid" />}
      <Alerts />
      <MainContainer>
        <Switch>
          <Route exact path="/asteroids">
            <AsteroidsTable />
          </Route>
          <Route path="/asteroids/:i">
            <AsteroidDetails />
          </Route>
          <Route path="/owned-asteroids">
            <OwnedAsteroidsTable />
          </Route>
          <Route path="/owned-crew">
            <OwnedCrew />
          </Route>
          <Route path="/crew/:i">
            <CrewMemberDetails />
          </Route>
          <Route path="/watchlist">
            <WatchlistTable />
          </Route>
          <Route path="/route">
            <RouteDetails />
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
