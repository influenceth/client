import { useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useIsFetching } from 'react-query'
import LoadingAnimation from 'react-spinners/BarLoader';

import useScreenSize from '~/hooks/useScreenSize';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import Alerts from './interface/Alerts';
import Draggables from './interface/Draggables';
import HUD from './interface/HUD';
import MainMenu from './interface/MainMenu';
import ListView from './interface/details/ListView';
import AsteroidDetails from './interface/details/AsteroidDetails';
import CrewAssignment from './interface/details/crewAssignments/Assignment';
import CrewAssignmentComplete from './interface/details/crewAssignments/Complete';
import CrewCreation from './interface/details/crewAssignments/Create';
import CrewAssignments from './interface/details/CrewAssignments';
import CrewmateDetails from './interface/details/CrewmateDetails';
import OwnedAsteroidsTable from './interface/details/OwnedAsteroidsTable';
import OwnedCrew from './interface/details/OwnedCrew';
import Marketplace from './interface/details/Marketplace';
import LotViewer from './interface/modelViewer/LotViewer';
import ShipViewer from './interface/modelViewer/ShipViewer';
import WatchlistTable from './interface/details/WatchlistTable';
import LinkedViewer from './interface/modelViewer/LinkedViewer';
import DevToolsViewer from './interface/modelViewer/DevToolsViewer';
import Cutscene from './Cutscene';
import Launcher from './Launcher';

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
  const isFetching = useIsFetching();
  const cutscene = useStore(s => s.cutscene);
  const launcherPage = useStore(s => s.launcherPage);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);
  const showDevTools = useStore(s => s.graphics.showDevTools);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);
  const dispatchToggleDevTools = useStore(s => s.dispatchToggleDevTools);

  const handleInterfaceShortcut = useCallback((e) => {
    // ctrl+f9
    if (e.ctrlKey && e.which === 120) dispatchToggleInterface();
    // ctrl+f10
    if (e.ctrlKey && e.which === 121) dispatchToggleDevTools();
  }, [dispatchToggleInterface, dispatchToggleDevTools]);

  useEffect(() => {
    document.addEventListener('keyup', handleInterfaceShortcut);
    return () => {
      document.removeEventListener('keyup', handleInterfaceShortcut);
    }
  }, [handleInterfaceShortcut]);

  return (
    <>
      <Alerts />
      {launcherPage && <Launcher />}
      {cutscene && <Cutscene />}
      {showDevTools && <DevToolsViewer />}
      <StyledInterface hide={interfaceHidden}>
        {!isMobile && <ReactTooltip id="global" place="left" effect="solid" />}
        {isFetching > 0 && <LoadingAnimation height={2} color={theme.colors.main} css={loadingCss} />}
        <MainContainer>
          <Switch>
            <Route exact path="/listview/:assetType?">
              <ListView />
            </Route>
            <Route path="/model/:assetType/:assetName?">
              <LinkedViewer />
            </Route>
            <Route path="/crew/:i(\d+)">
              <CrewmateDetails />
            </Route>
            <Route path="/owned-asteroids">
              <OwnedAsteroidsTable />
            </Route>
            <Route path="/watchlist">
              <WatchlistTable />
            </Route>
          </Switch>

          <LotViewer />
          <ShipViewer />
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
          <Route path="/marketplace/:asteroidId([0-9]+)/:lotId(all|[0-9]+)?/:discriminator?">
            <Marketplace />
          </Route>
        </Switch>
        <Draggables />
      </StyledInterface>
    </>
  );
};

export default Interface;
