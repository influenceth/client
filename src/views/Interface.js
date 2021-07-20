import styled from 'styled-components';
import { ThemeProvider } from 'styled-components'
import MainMenu from './interface/MainMenu';
import Pane from '~/components/Pane';
import theme from './theme';

const StyledInterface = styled.div`
  bottom: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 1000;
`;

const Interface = () => {
  return (
    <ThemeProvider theme={theme}>
      <StyledInterface>
        <MainMenu />
      </StyledInterface>
    </ThemeProvider>
  );
};

export default Interface;
