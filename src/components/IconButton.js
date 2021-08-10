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
    border-color: ${props => props.theme.colors.disabledText};
    color: ${props => props.theme.colors.disabledText};
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

  & > svg {
    height: 20px;
    width: 20px;
  }
`;

const CancelIndicator = styled.svg`
  bottom: 0;
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  height: 100% !important;
  left: 0;
  position: absolute;
  stroke: ${props => props.theme.colors.main};
  stroke-width: 2px;
  right: 0;
  top: 0;
  transition: all 300ms ease;
  width: 100% !important;

  &:hover {
    stroke: white;
  }
`;

const IconButton = (props) => {
  const { active, 'data-tip': dataTip } = props;

  useEffect(() => ReactTooltip.rebuild(), [ dataTip ]);

  return (
    // Adding 'key' forces data-tip to actually update on the tooltip
    <StyledIconButton data-for="global" key={dataTip} {...props}>
      {props.children}
      {active && (
        <CancelIndicator viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <line x1="6" y1="6" x2="24" y2="24" />
        </CancelIndicator>
      )}
    </StyledIconButton>
  );
};

export default IconButton;
