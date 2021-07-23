import styled from 'styled-components';
import { ThemeProvider } from 'styled-components'

import theme from '~/theme';

const StyledMain = styled.main`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Game = (props) => {
  return (
    <ThemeProvider theme={theme}>
      <StyledMain>
        {props.children}
      </StyledMain>
    </ThemeProvider>
  );
};

export default Game;
