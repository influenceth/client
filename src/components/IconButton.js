import styled from 'styled-components';

import Badge from '~/components/Badge';
import useStore from '~/hooks/useStore';
import { hexToRGB } from '~/theme';

const StyledIconButton = styled.button`
  align-items: center;
  border: ${p => p.borderless ? '0px' : '1px'} solid ${p => p.theme.colors[p.themeColor || 'main']};
  background-color: ${p => p.backgroundColor || 'transparent'};
  border-radius: 2px;
  color: ${p => p.theme.colors[p.themeColor || 'main']};
  display: flex;
  font-family: 'Jura', sans-serif;
  font-size: 15px;
  justify-content: center;
  height: 2em;
  width: 2em;
  transition: all 100ms ease;
  ${p => p.scale && `transform: scale(${p.scale});`}
  position: relative;
  margin-right: ${p => p.marginless ? 0 : '10px'};

  &:disabled {
    border-color: ${p => p.theme.colors.disabledText};
    color: ${p => p.theme.colors.disabledText};
  }

  &:hover {
    background-image: linear-gradient(
      120deg,
      rgba(${p => hexToRGB(p.theme.colors[p.themeColor || 'main'])}, 0.1),
      rgba(${p => hexToRGB(p.theme.colors[p.themeColor || 'main'])}, 0.25)
    );
    color: white;
    border-color: ${p => p.theme.colors.brightMain};
  }

  &:active {
    background-color: ${p => p.theme.colors[p.themeColor || 'main']};
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

const StyledBadge = styled(Badge)`
  font-size: 80%;
  left: -14px;
  position: absolute;
  top: -8px;
`;

const IconButton = (props) => {
  const { active, badge, badgeProps, dataPlace = 'right', dataTip, dataFor = 'globalTooltip', delayHide = 10, onClick, setRef, ...restProps} = props;
  const playSound = useStore(s => s.dispatchEffectStartRequested);

  const _onClick = (e) => {
    playSound('click');
    if (onClick) onClick(e);
  }

  if (setRef) restProps.ref = setRef;
  return (
    // Adding 'key' forces data-tooltip-content to actually update on the tooltip
    <StyledIconButton 
      key={dataTip}
      onClick={_onClick}
      data-tooltip-content={dataTip}
      data-tooltip-place={dataPlace}
      data-tooltip-id={dataFor}
      data-tooltip-delay-hide={delayHide}
      {...restProps}>
      {props.children}
      {props.badge !== undefined ? <StyledBadge value={props.badge} max={9} {...badgeProps} /> : null}
      {active && (
        <CancelIndicator viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <line x1="6" y1="6" x2="24" y2="24" />
        </CancelIndicator>
      )}
    </StyledIconButton>
  );
};

export default IconButton;
