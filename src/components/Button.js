import { useEffect } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

const StyledButton = styled.button`
  align-items: center;
  border: 1px solid ${props => props.theme.colors.main};
  background-color: ${props => props.active ? props.theme.colors.main : 'black'};
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 9.5px),
    calc(100% - 9.5px) 100%,
    0 100%
  );
  cursor: pointer;
  color: ${props => props.active ? 'white' : props.theme.colors.main};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  min-height: 35px;
  transition: all 300ms ease;
  padding: 0 10px;
  position: relative;
  min-width: 100px;
  width: 150px;

  &:disabled {
    color: ${props => props.theme.colors.disabledText};
    border-color: ${props => props.theme.colors.disabledText};

    & > svg {
      stroke: ${props => props.theme.colors.disabledText};
    }
  }

  &:hover {
    background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));
    color: white;
  }

  &:active {
    background-color: ${props => props.theme.colors.main};
    color: white;
  }

  &:disabled:hover {
    background-image: none;
    color: ${props => props.theme.colors.disabledText};
  }

  & > * {
    margin-right: 5px;
  }
`;

const Corner = styled.svg`
  bottom: -1px;
  height: 10px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${props => props.theme.colors.main};
  stroke-width: 1px;
  width: 10px;
`;

const Button = (props) => {
  useEffect(() => ReactTooltip.rebuild(), []);

  return (
    <StyledButton {...props} data-place="right">
      {props.children}
      <Corner viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="10" x2="10" y2="0" />
      </Corner>
    </StyledButton>
  );
};

export default Button;
