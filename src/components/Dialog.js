import React from '~/lib/react-debug';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const Backdrop = styled.div`
  animation: ${fadeIn} 200ms linear 1;
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;

  ${p => p.invisibleBackdrop ? '' : `
    backdrop-filter: blur(1.5px);
    background-color: ${p.backdrop || p.theme.colors.contentBackdrop};
  `}
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