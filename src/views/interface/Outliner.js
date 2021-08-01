import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import Wallet from './outliner/Wallet';
import SelectedAsteroid from './outliner/SelectedAsteroid';
import Watchlist from './outliner/Watchlist';
import OwnedAsteroids from './outliner/OwnedAsteroids';
import RoutePlanner from './outliner/RoutePlanner';
import TimeControl from './outliner/TimeControl';
import SystemControls from './outliner/SystemControls';

const MainContainer = styled.div`
  display: flex;
  flex: 0 1 auto;
  pointer-events: auto;
  position: relative;
`;

const Background = styled.div`
  background-color: ${props => props.theme.colors.contentBackdrop};
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
`;

const UprightBorder = styled.div`
  border-right: 2px solid ${props => props.theme.colors.mainBorder};
  flex: 1 1 auto;
`;

const CornerBorder = styled.svg`
  fill: ${props => props.theme.colors.mainBorder};
  flex: 0 0 auto;
  height: 50px;
  width: 25px;
`;

const RightContainer = styled.div`
  max-width: ${props => props.stayOpen ? '385px' : '25px'};
  transition: max-width 0.3s ease;

  &:hover {
    max-width: 385px;
  }
`;

const StyledOutliner = styled.div`
  width: 385px;
  max-height: calc(100% - 50px);
  overflow-y: scroll;
`;

const Outliner = (props) => {
  const outliner = useStore(state => state.outliner);
  const origin = useStore(state => state.asteroids.origin);

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
          {origin && <SelectedAsteroid asteroidId={origin} />}
          {outliner.ownedAsteroids.active && <OwnedAsteroids />}
          {outliner.watchlist.active && <Watchlist />}
          {outliner.routePlanner.active && <RoutePlanner />}
          {outliner.timeControl.active && <TimeControl />}
        </StyledOutliner>
        <SystemControls />
      </RightContainer>
      <Background />
    </MainContainer>
  );
};

export default Outliner;
