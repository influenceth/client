import { useEffect } from 'react';
import { START_TIMESTAMP } from 'influence-utils';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';

const StyledMain = styled.main`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Game = (props) => {
  // Update the game time to now
  const updateAdaliaTime = useStore(state => state.updateAdaliaTime);
  updateAdaliaTime(((Date.now() / 1000) - START_TIMESTAMP) / 3600);

  return (
    <StyledMain>
      {props.children}
    </StyledMain>
  );
};

export default Game;
