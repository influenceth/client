import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import Details from './interface/Details';
import MainMenu from './interface/MainMenu';
import Outliner from './interface/Outliner';

const StyledInterface = styled.div`
  align-items: stretch;
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
  position: relative;
`;

const Interface = () => {
  return (
    <StyledInterface>
      <ReactTooltip id="global" place="left" effect="solid" />
      <MainContainer>
        <Details />
        <MainMenu />
      </MainContainer>
      <Outliner />
    </StyledInterface>
  );
};

export default Interface;
