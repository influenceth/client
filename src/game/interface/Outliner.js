import { useEffect } from 'react';
import styled from 'styled-components';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import CrewAssignments from './outliner/CrewAssignments';
import Filters from './outliner/Filters';
import Log from './outliner/Log';
import MappedAsteroids from './outliner/MappedAsteroids';
import OwnedAsteroids from './outliner/OwnedAsteroids';
import OwnedCrew from './outliner/OwnedCrew';
import RoutePlanner from './outliner/RoutePlanner';
import SelectedAsteroid from './outliner/SelectedAsteroid';
import SystemControls from './outliner/SystemControls';
import TimeControl from './outliner/TimeControl';
import Wallet from './outliner/Wallet';
import Watchlist from './outliner/Watchlist';

const MainContainer = styled.div`
  display: flex;
  flex: 0 1 0;
  pointer-events: auto;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    min-width: 100%;
  }
`;

const Background = styled.div`
  background-color: ${p => p.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  clip-path: polygon(
    100% 0,
    100% 100%,
    0 100%,
    0 calc(100% - 25px),
    25px calc(100% - 50px),
    25px 0
  );
  position: absolute;
  pointer-events: none;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: -1;
`;

const Border = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 25px;
  width: 25px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const UprightBorder = styled.div`
  border-right: 2px solid ${p => p.theme.colors.mainBorder};
  flex: 1 1 auto;
`;

const CornerBorder = styled.svg`
  fill: ${p => p.theme.colors.mainBorder};
  flex: 0 0 auto;
  height: 50px;
  width: 25px;
`;

const RightContainer = styled.div`
  max-width: ${p => p.stayOpen ? '385px' : '25px'};
  transition: max-width 0.3s ease;

  &:hover {
    max-width: 385px;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    max-width: 100% !important;
    width: 100%;
  }
`;

const StyledOutliner = styled.div`
  max-height: calc(100% - 50px);
  overflow-y: auto;
  scrollbar-width: thin;
  width: 385px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    width: 100%;
  }
`;

const Outliner = (props) => {
  const outliner = useStore(s => s.outliner);
  const origin = useStore(s => s.asteroids.origin);
  const activateSection = useStore(s => s.dispatchOutlinerSectionActivated);
  const { account } = useAuth();

  useEffect(() => {
    if (origin) activateSection('selectedAsteroid');
  }, [ origin, activateSection ]);

  return (
    <MainContainer>
      <Border>
        <UprightBorder />
        <CornerBorder viewBox="0 0 25 50" xmlns="http://www.w3.org/2000/svg">
          <polygon points="0,50 0,46 23,25 23,0 25,0 25,25" />
        </CornerBorder>
      </Border>
      <RightContainer stayOpen={outliner.pinned}>
        <StyledOutliner>
          <Wallet />
          {!!account && <Log />}
          {outliner.filters?.active && <Filters />}
          {outliner.mappedAsteroids?.active && <MappedAsteroids />}
          {origin && <SelectedAsteroid asteroidId={origin} />}
          {outliner.ownedAsteroids?.active && !!account && <OwnedAsteroids />}
          {outliner.watchlist?.active && !!account && <Watchlist />}
          {outliner.routePlanner?.active && <RoutePlanner />}
          {outliner.ownedCrew?.active && !!account && <OwnedCrew />}
          {outliner.crewAssignments?.active && !!account && <CrewAssignments />}
          {outliner.timeControl?.active && <TimeControl />}
        </StyledOutliner>
        <SystemControls />
      </RightContainer>
      <Background />
    </MainContainer>
  );
};

export default Outliner;
