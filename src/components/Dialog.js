import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const Backdrop = styled.div`
  animation: ${fadeIn} 200ms linear 1;
  backdrop-filter: blur(1.5px);
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background-color: ${p => p.backdrop || p.theme.colors.contentBackdrop};
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  background: ${p => p.opaque ? 'black' : 'rgba(0, 0, 0, 0.9)'};
  color: white;
  min-width: 300px;
  min-height: 200px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  ${p => p.css || ``};
`;

const Dialog = ({ children, dialogCss, dialogStyle = {}, ...props }) => (
  <Backdrop {...props}>
    <Modal {...props} css={dialogCss} style={dialogStyle}>
      {children}
    </Modal>
  </Backdrop>
);

export default Dialog;