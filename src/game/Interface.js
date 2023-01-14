import { useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useIsFetching } from 'react-query'
import LoadingAnimation from 'react-spinners/BarLoader';

import useSale from '~/hooks/useSale';
import useScreenSize from '~/hooks/useScreenSize';
import useStore from '~/hooks/useStore';
import Alerts from './interface/Alerts';
import Draggables from './interface/Draggables';
import HUD from './interface/HUD';
import MainMenu from './interface/MainMenu';
import ModelViewer from './interface/ModelViewer';
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
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);
  const hideInterface = useStore(s => s.dispatchHideInterface);
  const showInterface = useStore(s => s.dispatchShowInterface);

  const handleInterfaceShortcut = useCallback((e) => {
    // ctrl+f9
    if (e.ctrlKey && e.which === 120) interfaceHidden ? showInterface() : hideInterface();
  }, [interfaceHidden]);

  useEffect(() => {
    document.addEventListener('keyup', handleInterfaceShortcut);
    return () => {
      document.removeEventListener('keyup', handleInterfaceShortcut);
    }
  }, [handleInterfaceShortcut]);

  return (
    <StyledInterface hide={interfaceHidden}>
      {!isMobile && <ReactTooltip id="global" place="left" effect="solid" />}
      {isFetching > 0 && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
      <Alerts />
      {sale && <SaleNotifier sale={sale} />}
      <MainContainer>
        <Switch>
          <Route exact path="/asteroids">
            <AsteroidsTable />
          </Route>
          <Route path="/building-viewer/:model?">
            <ModelViewer assetType="Building" />
          </Route>
          <Route path="/resource-viewer/:model?">
            <ModelViewer assetType="Resource" />
          </Route>
          <Route path="/crew/:i(\d+)">
            <CrewMemberDetails />
          </Route>
          <Route path="/owned-asteroids">
            <OwnedAsteroidsTable />
          </Route>
          <Route path="/route">
            <RouteDetails />
          </Route>
          <Route path="/watchlist">
            <WatchlistTable />
          </Route>
        </Switch>

        {zoomToPlot && <ModelViewer assetType="Building" plotZoomMode={zoomToPlot} />}
        <HUD />
        <MainMenu />
      </MainContainer>

      <Switch>
        <Redirect from="/:i(\d+)" to="/asteroids/:i" />
        <Route path="/asteroids/:i(\d+)/:tab?/:category?">
          <AsteroidDetails />
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
      </Switch>
      <Outliner />
      <Draggables />
    </StyledInterface>
  );
};

export default Interface;
