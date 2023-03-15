import { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { usePopper } from 'react-popper';

const InfoTooltip = styled.div`
  background: rgba(16,16,16,0.95);
  border: 1px solid #333;
  padding: 13px 13px 0;
  pointer-events: none;
  margin-bottom: 6px;
  opacity: 0;
  transform: translateY(0);
  transition: opacity 250ms ease, transform 250ms ease;
  width: 360px;

  ${p => p.css || ''};

  ${p => p.visible && `
    opacity: 1;
    ${p.cssWhenVisible}
  `}
`;

const MouseoverInfoPane = ({ children, css, cssWhenVisible, referenceEl, visible }) => {
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'top',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });

  if (!children) return null;
  return createPortal(
    <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000, pointerEvents: 'none' }} {...attributes.popper}>
      <InfoTooltip visible={visible} css={css} cssWhenVisible={cssWhenVisible}>
        {children}
      </InfoTooltip>
    </div>,
    document.body
  );
}

export default MouseoverInfoPane;