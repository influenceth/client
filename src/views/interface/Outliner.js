import styled from 'styled-components';
import { color } from 'styled-system';

const Wrapper = styled.div`
  background-color: rgba(0, 0, 0, 0.33);
  backdrop-filter: blur(4px);
  flex: 0 1 auto;
  height: 100%;
  padding-bottom: 50px;
  pointer-events: auto;
`;

const StyledOutliner = styled.div`
  border-left: 4px solid rgb(255, 255, 255, 0.25);
  height: 100%;
  min-width: 360px;
`;

const Outliner = (props) => {
  return (
    <Wrapper>
      <StyledOutliner>
      </StyledOutliner>
    </Wrapper>
  );
};

export default Outliner;
