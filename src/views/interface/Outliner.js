import styled from 'styled-components';

import Wallet from './outliner/Wallet';
import Watchlist from './outliner/Watchlist';

const StyledOutliner = styled.div`
  background-color: ${props => props.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  flex: 0 1 auto;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
  height: 100%;
  max-width: 25px;
  transition: max-width 0.3s ease;

  &:hover {
    max-width: 360px;
  }
`;

const Container = styled.div`
  padding: 0 10px;
  width: 360px;
`;

const Outliner = (props) => {
  return (
    <StyledOutliner>
      <Container>
        <Wallet />
        <Watchlist />
      </Container>
    </StyledOutliner>
  );
};

export default Outliner;
