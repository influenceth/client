import { useEffect, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';

const StyledMain = styled.main`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Game = (props) => {
  // Update the current game time once at launch
  const resetAdaliaTime = useStore(state => state.resetAdaliaTime);

  useEffect(() => {
    resetAdaliaTime();
  }, [ resetAdaliaTime ])

  return (
    <StyledMain>
      {props.children}
    </StyledMain>
  );
};

export default Game;
