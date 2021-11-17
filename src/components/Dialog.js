import React from 'react';
import styled from 'styled-components';

const Backdrop = styled.div`
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: ${p => p.theme.colors.contentBackdrop};
  z-index: 2147483647;
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