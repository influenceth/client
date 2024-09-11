import React from '~/lib/react-debug';
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
  0% { transform: scale(1); }
  8.3% { transform: scale(0.6); }
  16.6% { transform: scale(1); }
  100% { transform: scale(1); }
`;
const InnerCircle = styled.circle`
  animation: ${innerAnimation} 2000ms linear infinite;
  fill: currentColor;
  transform-origin: center;
`;

const ringAnimation = keyframes`
  0% {
    opacity: 0;
    transform: scale(1);
    stroke-width: 2;
  }
  8.3% {
    opacity: 0;
    transform: scale(1);
    stroke-width: 2;
  }
  16.6% {
    opacity: 1;
    transform: scale(2);
    stroke-width: 1;
  }
  50% {
    opacity: 0;
    transform: scale(6.67);
    stroke-width: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(6.67);
    stroke-width: 0.3;
  }
`;
const RingOne = styled.circle`
  animation: ${ringAnimation} 2000ms linear infinite;
  fill: transparent;
  stroke: currentColor;
  stroke-width: 2;
  transform-origin: center;
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
          <InnerCircle cx={50} cy={50} r={10} />
          <RingOne cx={50} cy={50} r={6} />
          <RingTwo cx={50} cy={50} r={6} />
        </Svg>
      </InnerWrapper>
    </Wrapper>
  );
};

export default AttentionDot;