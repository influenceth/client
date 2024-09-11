import React from '~/lib/react-debug';
import styled, { css, keyframes } from 'styled-components';

const innerDiamondDimensionDefault = 20;
const outerDiamondDimension = 47;
const outerDiamondStrokeDefault = 2;
const rounding = 2;

const Wrapper = styled.div`
  height: ${p => p.size};
  overflow: visible;
  position: relative;
  width: ${p => p.size};
`;

const InnerWrapper = styled.div`
  display: block;
  height: 200%;
  left: 50%;
  margin-left: -100%;
  margin-top: -100%;
  overflow: visible;
  position: absolute;
  top: 50%;
  transform: rotate(45deg);
  width: 200%;
  z-index: 2;
`;

const Svg = styled.svg`
  height: 100%;
  width: 100%;
`;

const InnerDiamond = styled.rect`
  transition: fill 150ms ease;
`;

const selectionKeyframes = keyframes`
  0% {
    transform: scale(1);
  }
  8.3% {
    transform: scale(0.75);
  }
  16.6% {
    transform: scale(1);
  }
  100% {
    transform: scale(1);
  }
`;
const selectionAnimation = css`
  animation: ${selectionKeyframes} 2000ms linear infinite;
`;
const SelectionDiamond = styled.rect`
  ${p => p.animate && selectionAnimation};
  fill: ${p => p.background || 'transparent'};
  stroke: ${p => {
    if (p.selected) {
      return p.selectedColor || p.theme.colors.main;
    } else if (p.unselectedBorder) {
      return p.unselectedBorder;
    }
    return 'transparent';
  }};
  stroke-width: ${p => (p.animate ? 1.75 : 1) * p.strokeWidth};
  transform-origin: center;
  transition: stroke 150ms ease;

  ${p => p.border ? `border: 1px solid ${p.border};` : ''}
`;

const highlightAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 0;
  }
  8.3% {
    transform: scale(0.75);
    opacity: 1;
  }
  16.6% {
    transform: scale(1);
  }
  50% {
    transform: scale(2);
    opacity: 0;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
`;
const HighlightDiamond = styled(SelectionDiamond)`
  animation: ${highlightAnimation} 2000ms linear infinite;
  opacity: 0;
  stroke: ${p => p.theme.colors.main};
`;

const NavIcon = ({ thicker, size, ...props }) => {
  const innerDiamondDimension = (thicker ? 1.5 : 1) * innerDiamondDimensionDefault;
  const outerDiamondStroke = (thicker ? 1.5 : 1) * outerDiamondStrokeDefault;
  const standardSize = Number.isInteger(size) ? `${size}px` : (size || '1em');
  return (
    <Wrapper size={standardSize} {...props}>
      <InnerWrapper {...props}>
        <Svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 100 100">
          <SelectionDiamond
            {...props}
            height={outerDiamondDimension}
            width={outerDiamondDimension}
            x={50 - outerDiamondDimension / 2}
            y={50 - outerDiamondDimension / 2}
            rx={rounding}
            strokeWidth={outerDiamondStroke} />
          <InnerDiamond
            fill={props.color || 'currentColor'}
            height={innerDiamondDimension}
            width={innerDiamondDimension}
            x={50 - innerDiamondDimension / 2}
            y={50 - innerDiamondDimension / 2}
            rx={rounding} />
          {props.selected && props.animate && (
            <HighlightDiamond
              {...props}
              height={outerDiamondDimension}
              width={outerDiamondDimension}
              x={50 - outerDiamondDimension / 2}
              y={50 - outerDiamondDimension / 2}
              rx={0} />
          )}
        </Svg>
      </InnerWrapper>
    </Wrapper>
  );
}

export default NavIcon;