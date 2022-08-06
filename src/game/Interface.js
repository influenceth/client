import { useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useIsFetching } from 'react-query'
import LoadingAnimation from 'react-spinners/BarLoader';

import useSale from '~/hooks/useSale';
import useScreenSize from '~/hooks/useScreenSize';
import Alerts from './interface/Alerts';
import Draggables from './interface/Draggables';
import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import SaleNotifier from './interface/SaleNotifier';
import AsteroidDetails from './interface/details/AsteroidDetails';
import AsteroidsTable from './interface/details/AsteroidsTable';
import CrewAssignment from './interface/details/crewAssignments/Assignment';
import CrewAssignmentComplete from './interface/details/crewAssignments/Complete';
import CrewCreation from './interface/details/crewAssignments/Create';
import CrewAssignments from './interface/details/CrewAssignments';
import CrewMemberDetails from './interface/details/CrewMemberDetails';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';
import OwnedCrew from './interface/details/OwnedCrew';
import RouteDetails from './interface/details/RouteDetails';
import Settings from './interface/details/Settings';
import WatchlistTable from './interface/details/WatchlistTable';
import theme from '~/theme';

const StyledInterface = styled.div`
  align-items: stretch;
  bottom: 0;
  display: ${p => p.hide ? 'none' : 'flex'};
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
  align-items: center;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  height: 100%;
  justify-content: flex-end;
  position: relative;
  min-width: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    align-items: normal;
    bottom: 0;
    position: absolute;
    width: 100%;
  }
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  z-index: 1;
`;

const Interface = () => {
  const { isMobile } = useScreenSize();
  const { data: sale } = useSale();
  const isFetching = useIsFetching();

  const [hideInterface, setHideInterface] = useState(false);

  // NOTE: requested by art team for easier screenshots vvv
  const toggleInterface = useCallback((e) => {
    if (e.ctrlKey && e.which === 120) { // ctrl+f9
      setHideInterface(!hideInterface);
    }
  }, [hideInterface]);

  useEffect(() => {
    document.addEventListener('keyup', toggleInterface);
    return () => {
      document.removeEventListener('keyup', toggleInterface);
    }
  }, [toggleInterface]);
  // ^^^

  return (
    <StyledInterface hide={hideInterface}>
      {!isMobile && <ReactTooltip id="global" place="left" effect="solid" />}
      {isFetching > 0 && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
      <Alerts />
      {sale && <SaleNotifier sale={sale} />}
      <MainContainer>
        <Switch>
          <Route exact path="/asteroids">
            <AsteroidsTable />
          </Route>
          <Redirect from="/:i(\d+)" to="/asteroids/:i" />
          <Route path="/asteroids/:i(\d+)">
            <AsteroidDetails />
          </Route>
          <Route path="/owned-asteroids">
            <OwnedAsteroidsTable />
          </Route>
          <Route path="/owned-crew">
            <OwnedCrew />
          </Route>
          <Route exact path="/crew-assignments/:id([a-z0-9]+)/:selected?">
            <CrewAssignments />
          </Route>
          <Route exact path="/crew-assignment/:id([a-z0-9]+)">
            <CrewAssignment />
          </Route>
          <Route path="/crew-assignment/:id([a-z0-9]+)/complete">
            <CrewAssignmentComplete />
          </Route>
          <Route path="/crew-assignment/:id([a-z0-9]+)/create">
            <CrewCreation />
          </Route>
          <Route path="/crew/:i(\d+)">
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
      <Draggables />
    </StyledInterface>
  );
};

export default Interface;
