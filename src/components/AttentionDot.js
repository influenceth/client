import React from 'react';
import styled, { keyframes } from 'styled-components';

const Wrapper = styled.div`
  height: ${p => p.size};
  overflow: visible;
  position: relative;
  width: ${p => p.size};
`;

const InnerWrapper = styled.div`
  display: block;
  height: 400%;
  left: 50%;
  margin-left: -200%;
  margin-top: -200%;
  overflow: visible;
  position: absolute;
  top: 50%;
  width: 400%;
  z-index: 2;
`;

const Svg = styled.svg`
  height: 100%;
  width: 100%;
`;

const innerAnimation = keyframes`
  0% { r: 10; }
  8.3% { r: 6; }
  16.6% { r: 10; }
  100% { r: 10; }
`;
const InnerCircle = styled.circle`
  animation: ${innerAnimation} 2000ms linear infinite;
  cx: 50;
  cy: 50;
  fill: currentColor;
  r: 10;
`;

const ringAnimation = keyframes`
  0% {
    opacity: 0;
    r: 6;
  }
  8.3% {
    opacity: 0;
    r: 6;
  }
  16.6% {
    opacity: 1;
    r: 12;
  }
  50% {
    opacity: 0;
    r: 40;
  }
  100% {
    opacity: 0;
    r: 40;
  }
`;
const RingOne = styled.circle`
  animation: ${ringAnimation} 2000ms linear infinite;
  cx: 50;
  cy: 50;
  fill: transparent;
  stroke: currentColor;
  stroke-width: 2;
  r: 6;
`;

const RingTwo = styled(RingOne)`
  animation-delay: 300ms;
`;

const AttentionDot = ({ size, ...props }) => {
  const standardSize = Number.isInteger(size) ? `${size}px` : (size || '1em');
  return (
    <Wrapper size={standardSize} {...props}>
      <InnerWrapper>
        <Svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 100 100">
          <InnerCircle />
          <RingOne />
          <RingTwo />
        </Svg>
      </InnerWrapper>
    </Wrapper>
  );
};

export default AttentionDot;