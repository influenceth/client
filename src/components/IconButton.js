import { useEffect } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

const StyledIconButton = styled.button`
  border: ${props => props.borderless ? '0px' : '1px'} solid ${props => props.theme.colors.main};
  background-color: transparent;
  border-radius: 2px;
  cursor: pointer;
  color: ${props => props.theme.colors.main};
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  height: 30px;
  width: 30px;
  padding: ${props => props.borderless ? '5px' : '4px'};
  transition: all 300ms ease;
  position: relative;
  margin-right: 10px;

  &:disabled {
    color: ${props => props.theme.colors.disabledText};
    border-color: ${props => props.theme.colors.disabledText};
  }

  &:hover {
    color: white;
    background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));
  }

  &:disabled:hover {
    color: ${props => props.theme.colors.disabledText};
    background-image: none;
  }

  & > svg {
    height: 20px;
    width: 20px;
  }
`;

const IconButton = (props) => {
  useEffect(() => ReactTooltip.rebuild(), []);

  return (
    <StyledIconButton data-for="global" {...props}>
      {props.children}
    </StyledIconButton>
  );
};

export default IconButton;
