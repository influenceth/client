import { useEffect } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

const StyledButton = styled.button`
  align-items: center;
  border: 1px solid ${props => props.theme.colors.main};
  background-color: transparent;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 11px),
    calc(100% - 11px) 100%,
    0 100%
  );
  cursor: pointer;
  color: ${props => props.theme.colors.main};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  min-height: 35px;
  transition: all 300ms ease;
  padding: 0 10px;
  position: relative;
  width: 150px;

  &:disabled {
    color: ${props => props.theme.colors.disabledText};
    border-color: ${props => props.theme.colors.disabledText};

    & > svg {
      stroke: ${props => props.theme.colors.disabledText};
    }
  }

  &:hover {
    color: white;
    background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));
  }

  &:disabled:hover {
    color: ${props => props.theme.colors.disabledText};
    background-image: none;
  }

  & > * {
    margin-right: 5px;
  }
`;

const Corner = styled.svg`
  bottom: 0;
  height: 10px;
  margin-right: 0;
  position: absolute;
  right: 0;
  stroke: ${props => props.theme.colors.main};
  stroke-width: 1px;
  width: 10px;
`;

const Button = (props) => {
  useEffect(() => ReactTooltip.rebuild(), []);

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
