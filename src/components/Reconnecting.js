import styled, { keyframes } from 'styled-components';

import { InfluenceIcon } from '~/components/Icons';
import Button from '~/components/ButtonDumb';

const opacityKeyframes = keyframes`
  0% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.65;
  }
`;

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100vh;
  justify-content: center;
  width: 100vw;
`;
const LogoWrapper = styled.div`
  font-size: 160px;
  line-height: 0;
  opacity: 0.33;
`;
const Message = styled.div`
  animation: ${opacityKeyframes} 1250ms ease-in-out infinite;
  font-weight: bold;
  margin: 20px 0 30px;
`;

const Reconnecting = ({ onLogout, walletName }) => (
  <Wrapper>
    <LogoWrapper><InfluenceIcon /></LogoWrapper>
    <Message>Attempting to reconnect to {walletName || 'your Starknet wallet'}...</Message>
    <Button onClick={onLogout} size="small">Skip Login</Button>
  </Wrapper>
);

export default Reconnecting;
