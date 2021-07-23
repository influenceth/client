import styled from 'styled-components';
import Details from './interface/Details';
import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';

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

const MainContainer = styled.div`
  flex: 1 0 auto;
  height: 100%;
  position: relative;
`;

const Interface = () => {
  return (
    <StyledInterface>
      <MainContainer>
        <Details />
        <MainMenu />
      </MainContainer>
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
