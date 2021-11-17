import React, { useEffect, useRef } from 'react';
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
  background-color: ${p => p.theme.colors.contentBackdrop};
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Modal = styled.div`
  background: rgba(0, 0, 0, 0.9);
  color: white;
  min-width: 300px;
  min-height: 200px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
`;

const Dialog = (props) => (
  <Backdrop>
    <Modal>
      {props.children}
    </Modal>
  </Backdrop>
);

export default Dialog;