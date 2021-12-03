import React from 'react';
import styled, { keyframes } from 'styled-components';

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
  height: 83.3%;
  justify-content: center;
  overflow: visible;
  position: relative;
  width: 83.3%;
  z-index: 2;
`;
const innerAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  8.3% {
    transform: scale(0.6);
  }
  16.6% {
    transform: scale(1);
  }
  100% {
    transform: scale(1);
  }
`;
const InnerIcon = styled.div`
  animation: ${innerAnimation} 2000ms linear infinite;
  background: currentColor;
  border-radius: 100%;
  height: 100%;
  width: 100%;
`;

const ringAnimation = keyframes`
  0% {
    height: 60%;
    opacity: 0;
    width: 60%;
  }
  8.3% {
    height: 60%;
    opacity: 0;
    width: 60%;
  }
  16.6% {
    height: 120%;
    opacity: 1;
    width: 120%;
  }
  50% {
    height: 400%;
    opacity: 0;
    width: 400%;
  }
  100% {
    height: 400%;
    opacity: 0;
    width: 400%;
  }
`;
const RingOne = styled.div`
  animation: ${ringAnimation} 2000ms linear infinite;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 100%;
  height: 60%;
  position: absolute;
  width: 60%;
`;

const RingTwo = styled(RingOne)`
  animation-delay: 300ms;
`;

const AttentionDot = ({ size, ...props }) => {
  const standardSize = Number.isInteger(size) ? `${size}px` : (size || '1em');
  return (
    <Wrapper {...props} size={standardSize}>
      <InnerWrapper>
        <InnerIcon />
        <RingOne />
        <RingTwo />
      </InnerWrapper>
    </Wrapper>
  );
}

export default AttentionDot;