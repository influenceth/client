import React from 'react';
import styled, { css, keyframes } from 'styled-components';

const Wrapper = styled.div`
  align-items: center;
  display: inline-flex;
  font-size: ${p => p.size};
  height: ${p => p.size};
  justify-content: center;
  overflow: visible;
  width: ${p => p.size};
`;

const InnerWrapper = styled.div`
  align-items: center;
  display: inline-flex;
  height: 100%;
  justify-content: center;
  overflow: visible;
  position: relative;
  transform: rotate(45deg);
  width: 100%;
  z-index: 2;
`;

const InnerIcon = styled.div`
  background: ${p => p.color || 'currentColor'};
  border-radius: 6.25%;
  width: 45%;
  height: 45%;
`;

const mainKeyframes = keyframes`
  0% {
    transform: scale(1);
  }
  8.3% {
    transform: scale(0.75);
  }
  16.6% {
    transform: scale(1);
  }
`;
const mainAnimation = css`
  animation: ${mainKeyframes} 2000ms linear infinite;
`;
const OuterSelectionIcon = styled.div`
  ${p => p.animate && mainAnimation};
  background: transparent;
  border: 1px solid ${p => p.selectedColor || p.theme.colors.main};
  border-radius: 6.25%;
  position: absolute;
  height: 100%;
  width: 100%;
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
`;
const OuterSelectionHighlight = styled.div`
  animation: ${highlightAnimation} 2000ms linear infinite;
  background: transparent;
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 0;
  opacity: 0;
  position: absolute;
  height: 100%;
  width: 100%;
`;

// TODO: currently, even-number size causes squares to appear misaligned
// (would be a nice enhancement to fix)
const NavIcon = ({ size, ...props }) => {
  const standardSize = Number.isInteger(size) ? `${size}px` : (size || '1em');
  return (
    <Wrapper {...props} size={standardSize}>
      <InnerWrapper>
        <InnerIcon {...props} />
        {props.selected && <OuterSelectionIcon {...props} />}
        {props.selected && props.animate && <OuterSelectionHighlight {...props} />}
      </InnerWrapper>
    </Wrapper>
  );
}

export default NavIcon;