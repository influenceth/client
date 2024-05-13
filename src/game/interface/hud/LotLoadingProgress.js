
import styled, { css, keyframes } from 'styled-components';

import useStore from '~/hooks/useStore';

const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const ProgressBar = styled.div`
  ${p => p.progress === 0 ? css`animation: ${opacityAnimation} 1250ms ease infinite;` : ``}
  background: #333;
  border-radius: 10px;
  height: 4px;
  overflow: hidden;
  position: relative;
  width: 100%;
  &:before {
    content: ' ';
    background: ${p => p.theme.colors.main};
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    transition: width 200ms ease;
    width: ${p => 100 * p.progress}%;
  }
`;

const LotLoadingProgress = ({ asteroidId }) => {
  const lotLoader = useStore(s => s.lotLoader);
  if (!(lotLoader.id === asteroidId && lotLoader.progress === 1)) {
    return <ProgressBar progress={lotLoader.id === asteroidId ? lotLoader.progress : 0} />;
  }
  return null;
}

export default LotLoadingProgress;