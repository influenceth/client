import { useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { Tooltip } from 'react-tooltip';
import { Switch, Route, Redirect } from 'react-router-dom';
import moment from 'moment';

import { PurchaseAsteroidIcon } from '~/components/Icons';
import useScreenSize from '~/hooks/useScreenSize';
import useStore from '~/hooks/useStore';
import { earlyAccessJSTime, openAccessJSTime } from '~/lib/utils';
import Alerts, { useControlledAlert } from './interface/Alerts';
import Draggables from './interface/Draggables';
import HUD from './interface/HUD';
import MainMenu from './interface/MainMenu';
import RecruitCrewmate from './interface/RecruitCrewmate';
import ListView from './interface/details/ListView';
import AsteroidDetails from './interface/details/AsteroidDetails';
// import CrewAssignment from './interface/details/crewAssignments/Assignment';
// import CrewAssignmentComplete from './interface/details/crewAssignments/Complete';
import CrewmateDetails from './interface/details/CrewmateDetails';
import Marketplace from './interface/details/Marketplace';
import LotViewer from './interface/modelViewer/LotViewer';
import ShipViewer from './interface/modelViewer/ShipViewer';
import LinkedViewer from './interface/modelViewer/LinkedViewer';
import DevToolsViewer from './interface/modelViewer/DevToolsViewer';
import CrewDetails from './interface/details/CrewDetails';
import Intro from './Intro';
import Cutscene from './Cutscene';
import Launcher from './Launcher';
import RandomEvent from './interface/RandomEvent';
import QueryLoader from './QueryLoader';
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

const DISABLE_INTRO_ANIMATION = true && process.env.NODE_ENV === 'development';

const Interface = () => {
  const { isMobile } = useScreenSize();
  const cutscene = useStore(s => s.cutscene);
  const launcherPage = useStore(s => s.launcherPage);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);
  const showDevTools = useStore(s => s.graphics.showDevTools);
  const dispatchRecenterCamera = useStore(s => s.dispatchRecenterCamera);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);
  const dispatchToggleDevTools = useStore(s => s.dispatchToggleDevTools);

  const handleInterfaceShortcut = useCallback((e) => {
    console.log(e.which)
    // ctrl+f9
    if (e.ctrlKey && e.which === 120) dispatchToggleInterface();
    // ctrl+f10
    if (e.ctrlKey && e.which === 121) dispatchToggleDevTools();
    // ctrl+period
    if (e.ctrlKey && e.which === 190) dispatchRecenterCamera(true);
    // ctrl+backslash
    if (e.ctrlKey && e.which === 220) dispatchReorientCamera(true);
  }, [dispatchToggleInterface, dispatchToggleDevTools, dispatchRecenterCamera, dispatchReorientCamera]);

  useEffect(() => {
    document.addEventListener('keyup', handleInterfaceShortcut);
    return () => {
      document.removeEventListener('keyup', handleInterfaceShortcut);
    }
  }, [handleInterfaceShortcut]);

  // TODO: _launcher vvv
  const { create, destroy } = useControlledAlert();
  useEffect(() => {
    if (`${process.env.REACT_APP_CHAIN_ID}` === `0x534e5f5345504f4c4941`) {
      if (Date.now() < openAccessJSTime) {
        const alertId = create({
          icon: <span style={{ color: theme.colors.success }}><PurchaseAsteroidIcon /></span>,
          content: (
            <div style={{ color: theme.colors.success }}>
              {Date.now() < earlyAccessJSTime
                ? `Early Access launches ${moment(earlyAccessJSTime).format('MMM Do YYYY, h:mm a')}`
                : `Open Access launches ${moment(openAccessJSTime).format('MMM Do YYYY, ha')}`
              }
            </div>
          ),
          level: 'success'
        });
        return () => {
          destroy(alertId);
        }
      }
    }
  }, []);
  // ^^^^

  return (
    <>
      <Alerts />
      {!DISABLE_INTRO_ANIMATION && <Intro />}
      {cutscene && <Cutscene />}
      {launcherPage && <Launcher />}
      {showDevTools && <DevToolsViewer />}
      <StyledInterface hide={interfaceHidden}>
        {!isMobile && <Tooltip id="globalTooltip" place="left" delayHide={60000} />}
        <QueryLoader />
        <MainContainer>
          <Switch>
            <Route exact path="/listview/:assetType?">
              <ListView />
            </Route>
            <Route path="/model/:assetType/:assetName?">
              <LinkedViewer />
            </Route>
            <Route path="/crew/:i(\d+)?">
              <CrewDetails />
            </Route>
            <Route path="/crewmate/:i(\d+)">
              <CrewmateDetails />
            </Route>
          </Switch>

          <LotViewer />
          <ShipViewer />
          <HUD />
          <MainMenu />
        </MainContainer>

        {/* TODO: ecs refactor -- it's unclear why this switch is different from the above... maybe reconcile? */}
        <Switch>
          <Redirect from="/:i(\d+)" to="/asteroids/:i" />
          <Route path="/asteroids/:i(\d+)/:tab?/:category?">
            <AsteroidDetails />
          </Route>
          <Route path="/recruit/:crewId([0-9]+)/:locationId([0-9]+)?/:crewmateId([0-9]+)?/:page?">
            <RecruitCrewmate />
          </Route>
          <Route path="/random-event">
            <RandomEvent />
          </Route>
          <Route path="/marketplace/:asteroidId([0-9]+)/:lotIndex(all|[0-9]+)?/:discriminator?">
            <Marketplace />
          </Route>
        </Switch>
        <Draggables />
      </StyledInterface>
    </>
  );
};

export default Interface;
