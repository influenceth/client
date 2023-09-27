import { useEffect } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';

import useStore from '~/hooks/useStore';

const StyledIconButton = styled.button`
  align-items: center;
  border: ${p => p.borderless ? '0px' : '1px'} solid ${p => p.theme.colors.main};
  background-color: ${p => p.backgroundColor || 'transparent'};
  border-radius: 2px;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  justify-content: center;
  height: 2em;
  width: 2em;
  transition: all 300ms ease;
  ${p => p.scale && `transform: scale(${p.scale});`}
  position: relative;
  margin-right: ${p => p.marginless ? 0 : '10px'};

  &:disabled {
    border-color: ${p => p.theme.colors.disabledText};
    color: ${p => p.theme.colors.disabledText};
  }

  &:hover {
    background-image: linear-gradient(120deg, rgba(54, 167, 205, 0.1), rgba(54, 167, 205, 0.25));
    color: white;
  }

  &:active {
    background-color: ${p => p.theme.colors.main};
    color: white;
  }

  &:disabled:hover {
    background-image: none;
    color: ${p => p.theme.colors.disabledText};
  }

  & > svg {
    height: 1.33em;
    width: 1.33em;
  }
`;

const CancelIndicator = styled.svg`
  bottom: 0;
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  height: 100% !important;
  left: 0;
  position: absolute;
  stroke: ${p => p.theme.colors.main};
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
  const { active, 'data-tip': dataTip, onClick, setRef, ...restProps} = props;
  const playSound = useStore(s => s.dispatchSoundRequested);

  const _onClick = (e) => {
    playSound('effects.click');
    if (onClick) onClick(e);
  }

  useEffect(() => ReactTooltip.rebuild(), [ dataTip ]);

  if (setRef) restProps.ref = setRef;
  return (
    // Adding 'key' forces data-tip to actually update on the tooltip
    <StyledIconButton {...restProps} onClick={_onClick} data-tip={dataTip} data-for="global" key={dataTip}>
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
