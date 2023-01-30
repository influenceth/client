import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { VscListUnordered as PopperIcon } from 'react-icons/vsc';

import Button from '~/components/ButtonRounded';
import useScreenSize from '~/hooks/useScreenSize';

const Wrapper = styled.div`
  position: relative;
`;

const ClickAwayListener = styled.div`
  background: transparent;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

const defaultWidth = 540;
const Content = styled.div.attrs(p => {
  const style = {
    width: `${p.overrides?.width || p.contentWidth || defaultWidth}px`
  };
  if (p.overrides?.top !== undefined) {
    style.top = `${p.overrides?.top}px`;
  }
  if (p.overrides?.left !== undefined) {
    style.left = `${p.overrides?.left}px`;
  } else {
    style.marginLeft = `-${(p.contentWidth || defaultWidth) * 0.2}px`;
  }
  return { style };
})`
  background: black;
  position: fixed;
  max-width: 100vw;
  z-index: 31;
`;

const Title = styled.div`
  border-left: 3px solid ${p => p.theme.colors.main};
  color: white;
  font-size: 20px;
  padding: 10px 15px;
  text-transform: uppercase;
`;
const Body = styled.div.attrs(p => ({
  style: {
    height: `${p.overrides?.height !== undefined
      ? p.overrides.height - 42 // offset is for title height
      : (p.contentHeight || 400)}px`
  }
}))``;

const Poppable = ({ children, closeOnChange, closeOnClickAway = true, disabled, label, title, ...styleProps }) => {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState();
  const { height, width } = useScreenSize();

  const handleToggle = useCallback(() => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);

  useEffect(() => {
    setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open) setOpen(false);
  }, [closeOnChange]);

  const contentRef = useRef();
  const initialPosition = useRef();
  useEffect(() => {
    if (contentRef.current && open) {
      if (!initialPosition.current) {
        var style = contentRef.current.currentStyle || window.getComputedStyle(contentRef.current);
        initialPosition.current = {
          top: contentRef.current.offsetTop + (parseInt(style.marginTop) || 0),
          height: contentRef.current.offsetHeight,
          left: contentRef.current.offsetLeft + (parseInt(style.marginLeft) || 0),
          width: contentRef.current.offsetWidth
        };
      }

      const override = {};
      const initialBottom = initialPosition.current.top + initialPosition.current.height;
      if (initialBottom > height) {
        override.top = Math.max(0, initialPosition.current.top - (initialBottom - height));
        if (initialPosition.current.height > height) {
          override.height = height;
        }
      }
      const initialRight = initialPosition.current.left + initialPosition.current.width;
      if (initialRight > width) {
        override.left = Math.max(0, initialPosition.current.left - (initialRight - width));
        if (initialPosition.current.width > width) {
          override.width = width;
        }
      }
      setOverride(override);
    }
  }, [height, width, open]);

  return (
    <Wrapper>
      <Button
        disabled={disabled}
        onClick={handleToggle}
        buttonWidth="135px"
        {...styleProps}>
        <PopperIcon /> <span>{label}</span>
      </Button>
      {open && (
        <>
          {closeOnClickAway && <ClickAwayListener onClick={() => setOpen(false)} />}
          <Content ref={contentRef} {...styleProps} overrides={override}>
            <Title>{title}</Title>
            <Body {...styleProps} overrides={override}>
              {children}
            </Body>
          </Content>
        </>
      )}
    </Wrapper>
  );
};

export default Poppable;