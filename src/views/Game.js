import styled from 'styled-components';

const StyledMain = styled.main`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Game = (props) => {
  return (
    <StyledMain>
      {props.children}
    </StyledMain>
  );
};

export default Game;
