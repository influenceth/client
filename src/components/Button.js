import styled from 'styled-components';

import theme from '~/theme';

const StyledButton = styled.button`
  border: 1px solid ${props => props.theme.colors.main};
  background-color: black;
  background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 11px),
    calc(100% - 11px) 100%,
    0 100%
  );
  cursor: pointer;
  color: ${props => props.theme.colors.main};
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  height: 35px;
  transition: all 300ms ease;
  padding: 0 10px;
  position: relative;

  &:hover {
    color: white;
    background-color: ${props => props.theme.colors.main};
  }
`;

const Corner = styled.svg`
  stroke: ${props => props.theme.colors.main};
  stroke-width: 1px;
  height: 10px;
  width: 10px;
  position: absolute;
  bottom: 0;
  right: 0;
`;

const Button = (props) => {
  return (
    <StyledButton {...props}>
      {props.children}
      <Corner viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="10" x2="10" y2="0" />
      </Corner>
    </StyledButton>
  );
};

export default Button;
