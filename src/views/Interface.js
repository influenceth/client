import styled from 'styled-components';
import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';
import Pane from '~/components/Pane';
import theme from '~/theme';

const StyledInterface = styled.div`
  align-items: flex-end;
  bottom: 0;
  display: flex;
  flex-direction: row;
  pointer-events: none;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 1000;
`;

const Interface = () => {
  return (
    <StyledInterface>
      <MainMenu />
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
