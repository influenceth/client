import React from '~/lib/react-debug';
import styled, { keyframes } from 'styled-components';

const animation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.5);
  }
  100% {
    transform: scale(1);
  }
`;

const Wrapper = styled.div`
  height: ${p => p.height}px;
  overflow: visible;
  position: relative;
  width: ${p => 3 * p.height}px;
`;

const Svg = styled.svg`
  height: 100%;
  width: 100%;
`;

const animationLength = 1250;
const Diamond = styled.path`
  animation: ${animation} ${animationLength}ms ease infinite;
  fill: currentColor;
  &:nth-child(1) {
    animation-delay: 0;
    transform-origin: 50px 50px;
  }
  &:nth-child(2) {
    animation-delay: ${0.15 * animationLength}ms;
    transform-origin: 150px 50px;
  }
  &:nth-child(3) {
    animation-delay: ${0.3 * animationLength}ms;
    transform-origin: 250px 50px;
  }
`;

const InProgressIcon = (props) => {
  return (
    <Wrapper {...props}>
      <Svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 300 100">
        <Diamond d="M 0,50 L 50,0 L 100,50 L 50,100 z" />
        <Diamond d="M 100,50 L 150,0 L 200,50 L 150,100 z" />
        <Diamond d="M 200,50 L 250,0 L 300,50 L 250,100 z" />
      </Svg>
    </Wrapper>
  );
}

export default InProgressIcon;