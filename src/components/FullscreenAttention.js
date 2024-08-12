import styled, { keyframes } from 'styled-components';

const stagger = 200;
const duration = 2000;
export const delay = 3000;
const finishedAt = Math.round(100 * duration / (duration + delay));
const pivot = Math.round(2 * finishedAt / 3);

const animation = keyframes`
  0% {
    opacity: 0;
    transform: scale(100);
  }
  ${pivot / 2}% {
    opacity: 0.15;
  }
  ${pivot}% {
    opacity: 0.75;
    transform: scale(1);
  }
  ${finishedAt}% {
    opacity: 0;
    transform: scale(2);
  }
  100% {
    opacity: 0;
  }
`;

const FullscreenAttention = styled.div`
  animation: ${animation} ${duration + delay}ms ease-out infinite;
  animation-delay: ${p => p.staggered ? stagger : 0}ms;
  border-radius: 3px;
  opacity: 0;
  outline: 2px solid ${p => `rgba(${p.theme.colors.mainRGB}, ${p.staggered ? 0.5 : 1})`};
  pointer-events: none;
  position: fixed;
  z-index: 1000000;
`;

export default FullscreenAttention;
