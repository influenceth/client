import styled, { keyframes } from 'styled-components';

const trayHeight = 80;
export const majorBorderColor = 'rgba(255, 255, 255, 0.2)';

export const opacityAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

export const Scrollable = styled.div`
  height: ${p => p.hasTray ? `calc(100% - ${trayHeight}px)` : '100%'};
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -12px;
`;

export const Tray = styled.div`
  align-items: center;
  border-top: 1px solid ${majorBorderColor};
  display: flex;
  flex-direction: row;
  height: ${trayHeight}px;
`;
